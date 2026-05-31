/**
 * POST /api/studio/analyze-video
 *
 * Dispatches the viral pipeline as a Trigger.dev background job for a logged-in user.
 * Checks monthly quota before triggering; increments usage on success.
 * Returns { ok, breakdown_id, status: "QUEUED" } immediately.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { productSchemaInputSchema } from '@/lib/engines/types'
import { viralAnalysisPipelineTask } from '@/trigger/viralAnalysisPipeline'

async function getUser() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    return user
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Please sign in to use Studio' }, { status: 401 })

  let body: { video_id?: string; product_schema?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { video_id, product_schema } = body

  if (!video_id || typeof video_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'video_id is required' }, { status: 400 })
  }

  // video_id is a UUID from our own DB — reject oversized or non-UUID values
  if (video_id.length > 100 || !/^[0-9a-f-]+$/i.test(video_id)) {
    return NextResponse.json({ ok: false, error: 'Invalid video_id' }, { status: 400 })
  }

  const parsedProduct = productSchemaInputSchema.safeParse(product_schema)
  if (!parsedProduct.success) {
    return NextResponse.json({
      ok:     false,
      error:  'Invalid product_schema',
      issues: parsedProduct.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    }, { status: 400 })
  }

  const service = createServiceClient()

  // ── Quota check ────────────────────────────────────────────────────────────
  await service.rpc('ensure_billing_tier', { uid: user.id })

  const { data: tier } = await service
    .from('user_billing_tiers')
    .select('tier_name, video_analysis_used, video_analysis_limit')
    .eq('user_id', user.id)
    .single()

  if (tier && tier.video_analysis_used >= tier.video_analysis_limit) {
    const planLabel = tier.tier_name === 'free' ? 'Free' : tier.tier_name.charAt(0).toUpperCase() + tier.tier_name.slice(1)
    return NextResponse.json({
      ok:      false,
      error:   'quota_exceeded',
      message: `You've used all ${tier.video_analysis_limit} analyses on the ${planLabel} plan. Upgrade to continue.`,
      used:    tier.video_analysis_used,
      limit:   tier.video_analysis_limit,
      tier:    tier.tier_name,
    }, { status: 402 })
  }

  // Ensure breakdown row exists; update or insert
  const { data: existing } = await service
    .from('video_breakdowns').select('id, viral_status').eq('video_id', video_id).maybeSingle()

  let breakdown_id: string

  // Cache hit: COMPLETED result already archived — return immediately without re-run or quota charge
  if (existing?.id && (existing as { viral_status?: string }).viral_status === 'COMPLETED') {
    return NextResponse.json({ ok: true, breakdown_id: existing.id, status: 'COMPLETED', fromCache: true })
  }

  if (existing?.id) {
    breakdown_id = existing.id
    await service.from('video_breakdowns')
      .update({ viral_status: 'PROCESSING', viral_error: null, user_id: user.id })
      .eq('id', breakdown_id)
  } else {
    const urlHash = Buffer.from(video_id).toString('base64url').slice(0, 32)
    const { data: inserted, error: insertErr } = await service
      .from('video_breakdowns')
      .insert({ video_id, url_hash: urlHash, payload: {}, blog_status: 'NOT_SENT', viral_status: 'PROCESSING', user_id: user.id })
      .select('id').single()

    if (insertErr || !inserted?.id) {
      if (insertErr?.code === '23505') {
        const { data: retried, error: retryErr } = await service
          .from('video_breakdowns')
          .insert({ video_id, url_hash: `${urlHash}-${Date.now().toString(36)}`, payload: {}, blog_status: 'NOT_SENT', viral_status: 'PROCESSING', user_id: user.id })
          .select('id').single()
        if (retryErr || !retried?.id) return NextResponse.json({ ok: false, error: 'Failed to create breakdown row' }, { status: 500 })
        breakdown_id = retried.id
      } else {
        return NextResponse.json({ ok: false, error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
      }
    } else {
      breakdown_id = inserted.id
    }
  }

  let handle: { id: string }
  try {
    handle = await viralAnalysisPipelineTask.trigger({
      video_id,
      product_schema: parsedProduct.data,
      top_n:          3,
      breakdown_id,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[studio/analyze-video] Trigger.dev error:', msg)
    try {
      await service.from('video_breakdowns')
        .update({ viral_status: 'FAILED', viral_error: `Trigger failed: ${msg}` })
        .eq('id', breakdown_id)
    } catch (dbErr) {
      console.error('[studio/analyze-video] Failed to revert viral_status:', dbErr)
    }
    return NextResponse.json({ ok: false, error: 'Failed to start analysis. Please try again.' }, { status: 500 })
  }

  // Increment quota usage atomically — .lt() guard prevents concurrent requests from
  // both incrementing from the same stale base value (TOCTOU race).
  // Supabase returns { error }, does NOT throw.
  // If tier is null (ensure_billing_tier race), skip to avoid resetting usage to 1.
  if (tier) {
    const { error: quotaIncErr } = await service.from('user_billing_tiers')
      .update({ video_analysis_used: tier.video_analysis_used + 1 })
      .eq('user_id', user.id)
      .eq('video_analysis_used', tier.video_analysis_used) // atomic: only updates if value unchanged
    if (quotaIncErr) {
      console.error('[studio/analyze-video] quota increment failed:', quotaIncErr.message)
    }
  }

  await service.from('video_breakdowns').update({ trigger_run_id: handle.id }).eq('id', breakdown_id)

  return NextResponse.json({ ok: true, breakdown_id, status: 'QUEUED' })
}
