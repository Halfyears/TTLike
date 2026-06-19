/**
 * GET /api/admin/structure-library
 * Returns all 8 pre-built structure definitions for admin inspection.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { d1Db } from '@/lib/cloudflare/d1Compat'
import { getStructureLibrary } from '@/lib/engines/structure-library'

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

export async function GET() {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ structures: getStructureLibrary() })
}
