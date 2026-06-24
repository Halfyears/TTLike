/**
 * POST /api/admin/viral-analysis-async
 *
 * Dispatches the viral pipeline as a Trigger.dev background job.
 * Returns immediately with { job_id, breakdown_id, status: "QUEUED" }.
 * Frontend polls GET /api/admin/viral-analysis-async/status?video_id=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { productSchemaInputSchema } from '@/lib/engines/types'
import { viralAnalysisPipelineTask } from '@/trigger/viralAnalysisPipeline'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export async function POST(req: NextRequest) {
  if (!await isCurrentUserAdmin()) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { video_id?: string; product_schema?: unknown; top_n?: number }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { video_id, product_schema, top_n } = body

  if (!video_id || typeof video_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'video_id is required' }, { status: 400 })
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

  // ── Ensure a breakdown row exists and mark PROCESSING ──────────────────────
  const { data: existing } = await service
    .from('video_breakdowns')
    .select('id, payload')
    .eq('video_id', video_id)
    .maybeSingle()

  let breakdown_id: string

  if (existing?.id) {
    breakdown_id = existing.id
    await service
      .from('video_breakdowns')
      .update({ viral_status: 'PROCESSING', viral_error: null })
      .eq('id', breakdown_id)
  } else {
    const urlHash = Buffer.from(video_id).toString('base64url').slice(0, 32)
    const { data: inserted, error: insertErr } = await service
      .from('video_breakdowns')
      .insert({
        video_id,
        url_hash:     urlHash,
        payload:      {},
        blog_status:  'NOT_SENT',
        viral_status: 'PROCESSING',
      })
      .select('id')
      .single()

    if (insertErr || !inserted?.id) {
      // Unique conflict — try with timestamp suffix
      if (insertErr?.code === '23505') {
        const { data: retried, error: retryErr } = await service
          .from('video_breakdowns')
          .insert({
            video_id,
            url_hash:     `${urlHash}-${Date.now().toString(36)}`,
            payload:      {},
            blog_status:  'NOT_SENT',
            viral_status: 'PROCESSING',
          })
          .select('id')
          .single()
        if (retryErr || !retried?.id) {
          return NextResponse.json({ ok: false, error: 'Failed to create breakdown row' }, { status: 500 })
        }
        breakdown_id = retried.id
      } else {
        return NextResponse.json({ ok: false, error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
      }
    } else {
      breakdown_id = inserted.id
    }
  }

  // ── Dispatch to Trigger.dev ────────────────────────────────────────────────
  const handle = await viralAnalysisPipelineTask.trigger({
    video_id,
    product_schema: parsedProduct.data,
    top_n:          typeof top_n === 'number' ? top_n : 3,
    breakdown_id,
  })

  // Store run ID for status tracking (best-effort — non-fatal if it fails)
  const { error: runIdErr } = await service
    .from('video_breakdowns')
    .update({ trigger_run_id: handle.id })
    .eq('id', breakdown_id)
  if (runIdErr) console.error('[viral-analysis-async] trigger_run_id update failed:', runIdErr.message)

  return NextResponse.json({
    ok:           true,
    job_id:       handle.id,
    breakdown_id,
    status:       'QUEUED',
  })
}
