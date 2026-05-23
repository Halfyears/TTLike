/**
 * GET  /api/admin/affiliates  — list all affiliate links
 * POST /api/admin/affiliates  — create a new affiliate link
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const links = await prisma.affiliateLink.findMany({
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
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (!body.destination?.trim()) {
    return NextResponse.json({ error: 'destination is required' }, { status: 400 })
  }

  // Use provided code or auto-generate; ensure uniqueness
  let code = (body.code?.trim() || generateCode()).toUpperCase()

  // If code already exists, append a suffix
  const existing = await prisma.affiliateLink.findUnique({ where: { code } }).catch(() => null)
  if (existing) {
    code = code + '-' + Math.random().toString(36).substring(2, 5).toUpperCase()
  }

  try {
    const link = await prisma.affiliateLink.create({
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
