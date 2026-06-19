/**
 * GET  /api/admin/users/spam  — list all spam rules
 * POST /api/admin/users/spam  — create a new spam rule
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { d1Db }       from '@/lib/cloudflare/d1Compat'

export const dynamic = 'force-dynamic'

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
  } catch { return false }
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const rules = await d1Db.spamRule.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ rules })
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    name:        string
    description?: string
    ruleType:    string
    config?:     Record<string, unknown>
    autoAction?: string | null
    isEnabled?:  boolean
  }

  if (!body.name || !body.ruleType) {
    return NextResponse.json({ error: 'name and ruleType are required' }, { status: 400 })
  }

  const rule = await d1Db.spamRule.create({
    data: {
      name:        body.name,
      description: body.description ?? null,
      ruleType:    body.ruleType,
      config:      body.config ? body.config as Record<string, unknown> : undefined,
      autoAction:  body.autoAction ?? null,
      isEnabled:   body.isEnabled ?? true,
    },
  })

  return NextResponse.json({ ok: true, rule })
}
