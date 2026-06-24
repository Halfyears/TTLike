/**
 * PATCH  /api/admin/promotions/[id]  — update a promotion
 * DELETE /api/admin/promotions/[id]  — delete a promotion
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

type Ctx = { params: Promise<{ id: string }> }

// ── PATCH ──────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body   = await req.json()
  const service = createServiceClient()

  // Only allow safe columns to be updated
  const update: Record<string, unknown> = {}
  const allowed = [
    'video_id', 'product_name', 'description', 'supplier_name', 'supplier_url',
    'platform', 'affiliate_code', 'affiliate_username', 'affiliate_url',
    'commission_rate', 'clicks', 'conversions', 'revenue', 'is_active',
  ]
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await service
    .from('promotions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ promotion: data })
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id }  = await params
  const service = createServiceClient()

  const { error } = await service.from('promotions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
