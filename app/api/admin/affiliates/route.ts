/**
 * GET  /api/admin/affiliates  — list all affiliate links
 * POST /api/admin/affiliates  — create a new affiliate link
 */

import { NextResponse } from 'next/server'
import { d1Db } from '@/lib/cloudflare/d1Compat'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'TTL-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const links = await d1Db.affiliateLink.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return NextResponse.json({ links })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (!body.destination?.trim()) {
    return NextResponse.json({ error: 'destination is required' }, { status: 400 })
  }

  // Use provided code or auto-generate; ensure uniqueness
  let code = (body.code?.trim() || generateCode()).toUpperCase()

  // If code already exists, append a suffix
  const existing = await d1Db.affiliateLink.findUnique({ where: { code } }).catch(() => null)
  if (existing) {
    code = code + '-' + Math.random().toString(36).substring(2, 5).toUpperCase()
  }

  try {
    const link = await d1Db.affiliateLink.create({
      data: {
        code,
        destination: body.destination.trim(),
        userId:      body.userId?.trim() || null,
        isActive:    body.isActive ?? true,
      },
    })
    return NextResponse.json({ link }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
