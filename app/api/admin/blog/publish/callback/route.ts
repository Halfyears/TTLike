/**
 * POST /api/admin/blog/publish/callback
 *
 * Called by n8n once the Ghost post has been published (or failed).
 * Updates video_breakdowns.blog_status + ghost_post_id.
 *
 * Expected body from n8n:
 * {
 *   breakdown_id:  string           // required — identifies the record
 *   status:        "PUBLISHED" | "FAILED"
 *   ghost_post_id: string           // Ghost internal post UUID
 *   ghost_url:     string           // live URL of the published post
 *   error_message: string           // only on FAILED
 * }
 *
 * Security: validates N8N_CALLBACK_SECRET header if N8N_CALLBACK_SECRET env is set.
 */

import { NextResponse }       from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // ── Optional shared-secret validation ──────────────────────────────────────
  const secret = process.env.N8N_CALLBACK_SECRET
  if (secret) {
    const header = req.headers.get('x-n8n-secret')
    if (header !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  let body: {
    breakdown_id?:  string
    status?:        'PUBLISHED' | 'FAILED'
    ghost_post_id?: string
    ghost_url?:     string
    error_message?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { breakdown_id, status, ghost_post_id, error_message } = body

  if (!breakdown_id || !status) {
    return NextResponse.json({ error: 'breakdown_id and status are required' }, { status: 400 })
  }
  if (status !== 'PUBLISHED' && status !== 'FAILED') {
    return NextResponse.json({ error: 'status must be PUBLISHED or FAILED' }, { status: 400 })
  }

  const service = createServiceClient()

  const updatePayload: Record<string, unknown> = {
    blog_status: status,
  }
  if (status === 'PUBLISHED') {
    updatePayload.ghost_post_id      = ghost_post_id ?? null
    updatePayload.blog_published_at  = new Date().toISOString()
  }

  const { error: updateErr } = await service
    .from('video_breakdowns')
    .update(updatePayload)
    .eq('id', breakdown_id)

  if (updateErr) {
    console.error('[blog/callback] DB update error:', updateErr.message)
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }

  console.log('[blog/callback] status updated —', breakdown_id, '→', status,
    status === 'FAILED' ? `| reason: ${error_message}` : `| ghost_id: ${ghost_post_id}`)

  return NextResponse.json({ ok: true, breakdown_id, status })
}
