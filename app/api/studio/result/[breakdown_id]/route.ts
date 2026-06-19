/**
 * GET /api/studio/result/[breakdown_id]
 *
 * Returns the Creative Blueprint + Script Layer for a completed analysis.
 * Transforms internal ViralPipeline data; hides Spike/Structure/Router/Language internals.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { viralPipelineToStudioResult } from '@/lib/utils/result-transform'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

async function getUser() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    return user
  } catch { return null }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ breakdown_id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { breakdown_id } = await params
  if (!breakdown_id) return NextResponse.json({ ok: false, error: 'breakdown_id required' }, { status: 400 })

  const service = createServiceClient()

  const { data, error } = await service
    .from('video_breakdowns')
    .select('id, user_id, viral_status, viral_error, payload, video_id')
    .eq('id', breakdown_id)
    .maybeSingle()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ ok: false, error: 'Result not found' }, { status: 404 })
  if ((data as { user_id?: string | null }).user_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'Result not found' }, { status: 404 })
  }

  if (data.viral_status !== 'COMPLETED') {
    return NextResponse.json({ ok: false, error: `Analysis not ready: ${data.viral_status}` }, { status: 202 })
  }

  const payload = data.payload as VideoBreakdownPayload
  const vp      = payload?.viral_pipeline

  if (!vp?.final_script) {
    return NextResponse.json({ ok: false, error: 'Pipeline result incomplete' }, { status: 500 })
  }

  const result = viralPipelineToStudioResult(vp)

  // Fetch video metadata for the result header (best-effort, null on failure)
  let videoMeta: { title: string | null; product_name: string | null; niche: string | null } | null = null
  if (data.video_id) {
    const { data: vid } = await service
      .from('tiktok_videos')
      .select('title, product_name, niche')
      .eq('id', data.video_id)
      .maybeSingle()
    if (vid) videoMeta = { title: vid.title ?? null, product_name: vid.product_name ?? null, niche: vid.niche ?? null }
  }

  // Transcript: only the fields the UI needs (timecode + spoken text)
  const rawTimeline = Array.isArray(payload?.visual_timeline) ? payload.visual_timeline : []
  const transcriptSegments = rawTimeline
    .filter(s => typeof s.audio === 'string' && s.audio.length > 0
               && typeof s.timecode === 'string' && s.timecode.length > 0)
    .map(s => ({ timecode: s.timecode as string, text: s.audio as string }))

  const hasAudio = transcriptSegments.length > 0 ||
    (typeof payload?.transcript_full === 'string' && payload.transcript_full.length > 0)

  return NextResponse.json({
    ok:                  true,
    generated_at:        vp.generated_at ?? new Date().toISOString(),
    pipeline_ms:         vp.pipeline_ms  ?? null,
    has_audio:           hasAudio,
    transcript_segments: transcriptSegments,   // [{timecode, text}]
    video_id:            data.video_id ?? null,
    video_meta:          videoMeta,            // {title, product_name, niche}
    ...result,
  })
}
