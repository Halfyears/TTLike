/**
 * GET /api/admin/viral-analysis-async/status?video_id=...
 *
 * Polling endpoint for Trigger.dev async pipeline status.
 * Returns current viral_status + summary data when COMPLETED.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function isAdmin(): Promise<boolean> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    try {
      const u = await prisma.user.findUnique({ where: { email: user.email! } })
      if (u?.role === 'ADMIN') return true
    } catch {}
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

export async function GET(req: NextRequest) {
  if (!await isAdmin()) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const video_id     = searchParams.get('video_id')
  const breakdown_id = searchParams.get('breakdown_id')

  if (!video_id && !breakdown_id) {
    return NextResponse.json({ ok: false, error: 'video_id or breakdown_id is required' }, { status: 400 })
  }

  const service = createServiceClient()

  const query = service
    .from('video_breakdowns')
    .select('id, viral_status, viral_error, trigger_run_id, blog_status, payload')

  const { data, error } = breakdown_id
    ? await query.eq('id', breakdown_id).maybeSingle()
    : await query.eq('video_id', video_id!).maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ ok: true, viral_status: 'PENDING', breakdown_id: null })
  }

  // Extract pipeline summary if completed
  let summary: Record<string, unknown> | null = null
  if (data.viral_status === 'COMPLETED') {
    const vp = (data.payload as Record<string, unknown>)?.viral_pipeline as Record<string, unknown> | undefined
    if (vp) {
      summary = {
        pipeline_ms:   (vp.pipeline_ms as number) ?? null,
        structure_id:  (vp.reasoning as Record<string, unknown>)?.structure_match
                         ? ((vp.reasoning as Record<string, unknown>).structure_match as Record<string, unknown>)?.structure_id
                         : null,
        top_structure: (vp.reasoning as Record<string, unknown>)?.router
                         ? ((vp.reasoning as Record<string, unknown>).router as Record<string, unknown>)?.top_structure
                         : null,
        hook_line:     (vp.final_script as Record<string, unknown>)?.hook_line ?? null,
        total_lines:   Array.isArray((vp.final_script as Record<string, unknown>)?.lines)
                         ? ((vp.final_script as Record<string, unknown>).lines as unknown[]).length
                         : null,
        providers:     vp.ai_providers ?? null,
      }
    }
  }

  return NextResponse.json({
    ok:             true,
    breakdown_id:   data.id,
    viral_status:   data.viral_status ?? 'PENDING',
    viral_error:    data.viral_error ?? null,
    trigger_run_id: data.trigger_run_id ?? null,
    blog_status:    data.blog_status ?? null,
    summary,
  })
}
