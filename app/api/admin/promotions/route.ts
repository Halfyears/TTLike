/**
 * GET  /api/admin/promotions  — list all promotions (joined with video)
 * POST /api/admin/promotions  — create a new promotion
 */

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

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()

  const { data, error } = await service
    .from('promotions')
    .select(`
      *,
      video:tiktok_videos (
        id, product_name, title, cover_url, author, viral_score
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ promotions: data ?? [] })
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Validate required fields
  if (!body.product_name?.trim()) {
    return NextResponse.json({ error: 'product_name is required' }, { status: 400 })
  }

  const service = createServiceClient()

  const insert = {
    video_id:           body.video_id           || null,
    product_name:       body.product_name.trim(),
    description:        body.description?.trim() || null,
    supplier_name:      body.supplier_name?.trim() || null,
    supplier_url:       body.supplier_url?.trim() || null,
    platform:           body.platform            || null,
    affiliate_code:     body.affiliate_code?.trim() || null,
    affiliate_username: body.affiliate_username?.trim() || null,
    affiliate_url:      body.affiliate_url?.trim() || null,
    commission_rate:    body.commission_rate      ?? 0,
    is_active:          body.is_active            ?? true,
  }

  const { data, error } = await service
    .from('promotions')
    .insert(insert)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ promotion: data }, { status: 201 })
}
