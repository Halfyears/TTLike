/**
 * POST /api/admin/videos/reorder
 *
 * Admin-only endpoint to bulk-save sort_order for TikTok videos.
 * Body: { items: Array<{ id: string; sort_order: number }> }
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { d1Db } from '@/lib/cloudflare/d1Compat'

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const dbUser = await d1Db.user.findUnique({ where: { email: user.email! } })
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
  if (body.items.length > 2000) {
    return NextResponse.json({ error: 'Too many items (max 2000)' }, { status: 400 })
  }
  // Validate each item — reject if id missing or sort_order is not a finite number
  const invalid = body.items.find(
    item => typeof item.id !== 'string' || !item.id || !Number.isFinite(item.sort_order)
  )
  if (invalid) {
    return NextResponse.json({ error: 'Each item must have a string id and numeric sort_order' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Use individual UPDATE calls in parallel batches of 50.
  // Avoids upsert's INSERT path which fails on NOT NULL columns.
  const BATCH = 50
  for (let i = 0; i < body.items.length; i += BATCH) {
    const batch = body.items.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(item =>
        supabase
          .from('tiktok_videos')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
      )
    )
    const failed = results.find(r => r.error)
    if (failed?.error) {
      console.error('[admin/videos/reorder] update error:', failed.error)
      return NextResponse.json({ error: failed.error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, updated: body.items.length })
}
