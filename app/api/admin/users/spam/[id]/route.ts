/**
 * PATCH  /api/admin/users/spam/[id]  — update spam rule
 * DELETE /api/admin/users/spam/[id]  — delete spam rule
 */

import { NextResponse } from 'next/server'
import { d1Db }       from '@/lib/cloudflare/d1Compat'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as Partial<{
    name:        string
    description: string
    ruleType:    string
    config:      Record<string, unknown>
    autoAction:  string | null
    isEnabled:   boolean
  }>

  const rule = await d1Db.spamRule.update({
    where: { id },
    data: {
      ...(body.name        !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.ruleType    !== undefined && { ruleType: body.ruleType }),
      ...(body.config      !== undefined && { config: body.config as Record<string, unknown> }),
      ...(body.autoAction  !== undefined && { autoAction: body.autoAction }),
      ...(body.isEnabled   !== undefined && { isEnabled: body.isEnabled }),
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true, rule })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await d1Db.spamRule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
