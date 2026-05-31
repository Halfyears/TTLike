/**
 * GET /api/behavior/badges
 * Returns the authenticated user's BadgeLog entries (most recent first, limit 20).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const badges = await prisma.badgeLog.findMany({
    where:   { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take:    20,
    select:  { id: true, badgeType: true, createdAt: true },
  })

  return NextResponse.json({ badges })
}
