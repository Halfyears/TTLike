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
    .select('id, viral_status, viral_error, payload')
    .eq('id', breakdown_id)
    .maybeSingle()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ ok: false, error: 'Result not found' }, { status: 404 })

  if (data.viral_status !== 'COMPLETED') {
    return NextResponse.json({ ok: false, error: `Analysis not ready: ${data.viral_status}` }, { status: 202 })
  }

  const payload = data.payload as VideoBreakdownPayload
  const vp      = payload?.viral_pipeline

  if (!vp?.final_script) {
    return NextResponse.json({ ok: false, error: 'Pipeline result incomplete' }, { status: 500 })
  }

  const result = viralPipelineToStudioResult(vp)

  return NextResponse.json({ ok: true, ...result })
}
