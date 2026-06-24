/**
 * PATCH  /api/admin/affiliates/[id]  — update a link
 * DELETE /api/admin/affiliates/[id]  — delete a link
 */

import { NextResponse } from 'next/server'
import { d1Db } from '@/lib/cloudflare/d1Compat'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

type Ctx = { params: Promise<{ id: string }> }

// ── PATCH ──────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body   = await req.json()

  const update: Record<string, unknown> = {}
  if ('destination' in body) update.destination = body.destination?.trim() || undefined
  if ('isActive'    in body) update.isActive    = Boolean(body.isActive)
  if ('clicks'      in body) update.clicks      = Number(body.clicks)
  if ('conversions' in body) update.conversions = Number(body.conversions)
  if ('revenue'     in body) update.revenue     = Number(body.revenue)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const link = await d1Db.affiliateLink.update({ where: { id }, data: update })
    return NextResponse.json({ link })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  try {
    await d1Db.affiliateLink.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
