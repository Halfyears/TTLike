/**
 * GET  /api/admin/users/spam  — list all spam rules
 * POST /api/admin/users/spam  — create a new spam rule
 */

import { NextResponse } from 'next/server'
import { d1Db }       from '@/lib/cloudflare/d1Compat'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const rules = await d1Db.spamRule.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ rules })
}

export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
