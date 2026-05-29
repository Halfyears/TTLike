/**
 * POST /api/admin/blog/reset-stuck
 *
 * Resets stuck PROCESSING breakdowns back to NOT_SENT so they can be retried.
 * Body: { breakdown_id?: string }  — if omitted, resets ALL PROCESSING rows.
 */

import { NextResponse } from 'next/server'
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

export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
