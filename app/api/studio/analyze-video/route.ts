/**
 * POST /api/studio/analyze-video
 *
 * Dispatches the viral pipeline as a Trigger.dev background job for a logged-in user.
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

  const parsedProduct = productSchemaInputSchema.safeParse(product_schema)
  if (!parsedProduct.success) {
    return NextResponse.json({
      ok:     false,
      error:  'Invalid product_schema',
      issues: parsedProduct.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    }, { status: 400 })
  }

  const service = createServiceClient()

  // Ensure breakdown row exists; update or insert
  const { data: existing } = await service
    .from('video_breakdowns').select('id').eq('video_id', video_id).maybeSingle()

  let breakdown_id: string

  if (existing?.id) {
    breakdown_id = existing.id
    await service.from('video_breakdowns')
      .update({ viral_status: 'PROCESSING', viral_error: null })
      .eq('id', breakdown_id)
  } else {
    const urlHash = Buffer.from(video_id).toString('base64url').slice(0, 32)
    const { data: inserted, error: insertErr } = await service
      .from('video_breakdowns')
      .insert({ video_id, url_hash: urlHash, payload: {}, blog_status: 'NOT_SENT', viral_status: 'PROCESSING' })
      .select('id').single()

    if (insertErr || !inserted?.id) {
      if (insertErr?.code === '23505') {
        const { data: retried, error: retryErr } = await service
          .from('video_breakdowns')
          .insert({ video_id, url_hash: `${urlHash}-${Date.now().toString(36)}`, payload: {}, blog_status: 'NOT_SENT', viral_status: 'PROCESSING' })
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
    // Revert status so the row isn't stuck in PROCESSING (best-effort, non-fatal)
    try {
      await service.from('video_breakdowns')
        .update({ viral_status: 'FAILED', viral_error: `Trigger failed: ${msg}` })
        .eq('id', breakdown_id)
    } catch (dbErr) {
      console.error('[studio/analyze-video] Failed to revert viral_status:', dbErr)
    }
    return NextResponse.json({ ok: false, error: 'Failed to start analysis. Please try again.' }, { status: 500 })
  }

  await service.from('video_breakdowns').update({ trigger_run_id: handle.id }).eq('id', breakdown_id)

  return NextResponse.json({ ok: true, breakdown_id, status: 'QUEUED' })
}
