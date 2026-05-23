/**
 * POST /api/analyze/health-report
 *
 * Generates and caches the AI Structural Health Report for a video.
 * Stored in video_breakdowns with url_hash prefix "health:" to separate
 * from the main viral breakdown cache (prefix "video:").
 *
 * Cost: ~$0.0002 per uncached call. Never re-bills for same video_id.
 */

import { NextResponse }        from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { callHealthReport }    from '@/lib/ai/healthReportPrompt'
import { createHash }          from 'crypto'

function healthHash(videoId: string): string {
  return createHash('md5').update(`health:${videoId}`).digest('hex')
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
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

  const service  = createServiceClient()
  const cacheKey = healthHash(video_id)

  // ── 1. Cache check ──────────────────────────────────────────────────────────
  const { data: cached } = await service
    .from('video_breakdowns')
    .select('payload')
    .eq('url_hash', cacheKey)
    .maybeSingle()

  if (cached?.payload?.health_report) {
    return NextResponse.json({ report: cached.payload.health_report, fromCache: true })
  }

  // ── 2. Fetch video metadata ─────────────────────────────────────────────────
  const { data: meta } = await service
    .from('tiktok_videos')
    .select('id, title, product_name, niche, views, likes, shares, author')
    .eq('id', video_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!meta) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  // ── 3. Generate health report via Gemini ────────────────────────────────────
  let report
  try {
    report = await callHealthReport({
      title:        String(meta.title        ?? ''),
      product_name: meta.product_name,
      niche:        meta.niche,
      views:        Number(meta.views        ?? 0),
      likes:        Number(meta.likes        ?? 0),
      shares:       Number(meta.shares       ?? 0),
      author:       String(meta.author       ?? ''),
    })
  } catch (e) {
    console.error('[health-report] Gemini error:', e)
    return NextResponse.json({ error: 'AI analysis failed — try again later' }, { status: 500 })
  }

  // ── 4. Cache (fire-and-forget) ──────────────────────────────────────────────
  service
    .from('video_breakdowns')
    .insert({
      url_hash: cacheKey,
      video_id: meta.id,
      payload:  { health_report: report },
    })
    .then(({ error }) => {
      if (error) console.error('[health-report] cache write error:', error.message)
    })

  return NextResponse.json({ report, fromCache: false })
}
