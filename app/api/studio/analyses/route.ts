/**
 * GET /api/studio/analyses
 *
 * Returns the authenticated user's completed Viral Studio analyses
 * (from video_breakdowns where user_id = ?, viral_status = COMPLETED).
 * Requires user_id column on video_breakdowns — added via migration.
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface AnalysisItem {
  id:           string
  video_id:     string
  product_name: string | null
  category:     string
  hook_line:    string | null
  pipeline_ms:  number | null
  created_at:   string
}

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data, error } = await service
    .from('video_breakdowns')
    .select('id, video_id, payload, created_at')
    .eq('user_id', user.id)
    .eq('viral_status', 'COMPLETED')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items: AnalysisItem[] = (data ?? []).map(row => {
    const vp            = (row.payload as Record<string, unknown>)?.viral_pipeline as Record<string, unknown> | undefined
    const productSchema = (vp?.input as Record<string, unknown>)?.product_schema   as Record<string, unknown> | undefined
    const finalScript   = vp?.final_script                                          as Record<string, unknown> | undefined
    return {
      id:           row.id,
      video_id:     row.video_id,
      product_name: productSchema?.product_name ? String(productSchema.product_name) : null,
      category:     String(productSchema?.category ?? 'General'),
      hook_line:    finalScript?.hook_line ? String(finalScript.hook_line) : null,
      pipeline_ms:  vp?.pipeline_ms ? Number(vp.pipeline_ms) : null,
      created_at:   row.created_at as string,
    }
  })

  return NextResponse.json({ ok: true, items })
}
