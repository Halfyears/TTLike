/**
 * POST /api/analyze/health-report
 *
 * Generates and caches the AI Structural Health Report for a video.
 * Requires authentication + Creator/Scale tier (strategy_audit_limit > 0).
 * Increments strategy_audit_used on uncached generation.
 *
 * Stored in video_breakdowns with url_hash prefix "health:" to separate
 * from the main viral breakdown cache (prefix "video:").
 *
 * Cost: ~$0.0002 per uncached call. Never re-bills for same video_id.
 */

import { NextResponse }        from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { callHealthReport }    from '@/lib/ai/healthReportPrompt'
import { createHash }          from 'crypto'

function healthHash(videoId: string): string {
  return createHash('md5').update(`health:${videoId}`).digest('hex')
}

export async function POST(req: Request) {
  // ── 0. Auth check ───────────────────────────────────────────────────────────
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to generate the Structural Health Report.' },
      { status: 401 },
    )
  }

  let body: { video_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { video_id } = body
  if (!video_id) {
    return NextResponse.json({ error: 'video_id is required' }, { status: 400 })
  }
  if (typeof video_id !== 'string' || video_id.length > 100 || !/^[0-9a-f-]+$/i.test(video_id)) {
    return NextResponse.json({ error: 'Invalid video_id' }, { status: 400 })
  }

  const service  = createServiceClient()
  const cacheKey = healthHash(video_id)

  // ── 1. Tier gate (before cache — free users must not read cached paid reports) ──
  await service.rpc('ensure_billing_tier', { uid: user.id })

  const { data: tierRow } = await service
    .from('user_billing_tiers')
    .select('tier_name, strategy_audit_used, strategy_audit_limit')
    .eq('user_id', user.id)
    .single()

  const limit = tierRow?.strategy_audit_limit ?? 0
  const used  = tierRow?.strategy_audit_used  ?? 0

  if (limit === 0) {
    return NextResponse.json(
      { error: 'upgrade_required', tier: tierRow?.tier_name ?? 'free' },
      { status: 403 },
    )
  }

  // ── 2. Cache check (no quota consumed for cached results) ──────────────────
  const { data: cached } = await service
    .from('video_breakdowns')
    .select('payload')
    .eq('url_hash', cacheKey)
    .maybeSingle()

  if (cached?.payload?.health_report) {
    return NextResponse.json({
      report:      cached.payload.health_report,
      ai_provider: (cached.payload as { ai_provider?: string }).ai_provider ?? null,
      fromCache:   true,
    })
  }

  // ── 3. Fetch video metadata ─────────────────────────────────────────────────
  const { data: meta } = await service
    .from('tiktok_videos')
    .select('id, title, product_name, niche, views, likes, shares, author')
    .eq('id', video_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!meta) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  // ── 4. Atomic quota claim — only increments if still under limit ──────────────
  // Uses a conditional UPDATE (WHERE used < limit) so two concurrent requests
  // cannot both claim the last slot: exactly one will match, the other gets 0 rows.
  // .select('user_id') is required to get affected rows back in Supabase JS v2.
  const { data: claimedData, error: quotaErr } = await service
    .from('user_billing_tiers')
    .update({ strategy_audit_used: used + 1 })
    .eq('user_id', user.id)
    .lt('strategy_audit_used', limit)   // atomic guard: only updates if still under limit
    .select('user_id')

  if (quotaErr) {
    console.error('[health-report] quota claim failed:', quotaErr.message)
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
  }

  if (!claimedData || claimedData.length === 0) {
    // Another concurrent request already consumed the last slot
    return NextResponse.json(
      { error: 'quota_exceeded', used: limit, limit },
      { status: 402 },
    )
  }

  // ── 5. Generate health report via AI waterfall ──────────────────────────────
  let healthResult: Awaited<ReturnType<typeof callHealthReport>>
  try {
    healthResult = await callHealthReport({
      title:        String(meta.title        ?? ''),
      product_name: meta.product_name,
      niche:        meta.niche,
      views:        Number(meta.views        ?? 0),
      likes:        Number(meta.likes        ?? 0),
      shares:       Number(meta.shares       ?? 0),
      author:       String(meta.author       ?? ''),
    })
  } catch (e) {
    console.error('[health-report] AI error:', e)
    // Compensate: release the slot — only decrement if value is still > 0 (safety guard)
    void service.from('user_billing_tiers')
      .update({ strategy_audit_used: used })   // reset to pre-claim snapshot
      .eq('user_id', user.id)
      .gt('strategy_audit_used', 0)
    return NextResponse.json({ error: 'AI analysis failed — try again later' }, { status: 500 })
  }

  const { report, ai_provider } = healthResult

  // ── 6. Persist to DB ────────────────────────────────────────────────────────
  const { data: insertedRow, error: insertError } = await service
    .from('video_breakdowns')
    .insert({ url_hash: cacheKey, video_id: meta.id, payload: { health_report: report, ai_provider } })
    .select('id')
    .maybeSingle()

  if (insertError) {
    if (insertError.code === '23505') {
      console.log('[health-report] duplicate url_hash (race condition) — record already exists:', cacheKey)
    } else {
      console.error('[health-report] DB INSERT FAILED — code:', insertError.code,
        '| message:', insertError.message,
        '| details:', insertError.details,
        '| hint:', insertError.hint)
    }
  } else {
    console.log('[health-report] report saved OK — db_id:', insertedRow?.id)
  }

  return NextResponse.json({ report, ai_provider, fromCache: false })
}
