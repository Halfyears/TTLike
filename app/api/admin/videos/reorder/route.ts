/**
 * POST /api/admin/videos/reorder
 *
 * Admin-only endpoint to bulk-save sort_order for TikTok videos.
 * Body: { items: Array<{ id: string; sort_order: number }> }
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

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { items: Array<{ id: string; sort_order: number }> }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'items array required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Upsert all rows — updates only the sort_order column via conflict on id
  const { error } = await supabase
    .from('tiktok_videos')
    .upsert(body.items, { onConflict: 'id' })

  if (error) {
    console.error('[admin/videos/reorder] upsert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, updated: body.items.length })
}
