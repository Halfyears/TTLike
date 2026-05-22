/**
 * PATCH /api/admin/videos/[id]
 *
 * Admin-only endpoint to soft-delete or restore a TikTok video.
 * Body: { action: 'delete' | 'restore' }
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
      if (dbUser?.role === 'ADMIN') return true
    } catch {}
    return user.email === process.env.ADMIN_EMAIL
  } catch {
    return false
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as { action: 'delete' | 'restore' }

  const supabase = createServiceClient()

  const update =
    body.action === 'delete'
      ? { deleted_at: new Date().toISOString() }
      : { deleted_at: null }

  const { error } = await supabase
    .from('tiktok_videos')
    .update(update)
    .eq('id', id)

  if (error) {
    console.error('[admin/videos] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, action: body.action, id })
}
