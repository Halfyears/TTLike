/**
 * POST /api/admin/blog/reset-stuck
 *
 * Resets stuck PROCESSING breakdowns back to NOT_SENT so they can be retried.
 * Body: { breakdown_id?: string }  — if omitted, resets ALL PROCESSING rows.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export async function POST(req: Request) {
  if (!await isCurrentUserAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { breakdown_id?: string } = {}
  try { body = await req.json() } catch { /* empty body OK */ }

  const service = createServiceClient()

  let query = service
    .from('video_breakdowns')
    .update({ blog_status: 'NOT_SENT' })
    .eq('blog_status', 'PROCESSING')

  if (body.breakdown_id) {
    query = query.eq('id', body.breakdown_id)
  }

  const { error, count } = await query.select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, reset: count ?? 0 })
}
