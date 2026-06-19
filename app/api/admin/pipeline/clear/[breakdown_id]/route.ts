import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { d1Db } from '@/lib/cloudflare/d1Compat'

async function isAdmin(): Promise<boolean> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    try {
      const u = await d1Db.user.findUnique({ where: { email: user.email! } })
      if (u?.role === 'ADMIN') return true
    } catch {}
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ breakdown_id: string }> },
) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { breakdown_id } = await params
  const service = createServiceClient()

  const { data: bd } = await service
    .from('video_breakdowns')
    .select('id, payload')
    .eq('id', breakdown_id)
    .maybeSingle()

  if (!bd) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updatedPayload = { ...(bd.payload as object ?? {}), viral_pipeline: null }
  const { error } = await service
    .from('video_breakdowns')
    .update({ payload: updatedPayload })
    .eq('id', breakdown_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
