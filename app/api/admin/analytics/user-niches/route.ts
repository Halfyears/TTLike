/**
 * GET /api/admin/analytics/user-niches?user_id=uuid
 *
 * Returns the niche distribution for a single user from user_niche_profiles.
 * Used by the Niche Profile card on the admin user detail page.
 */

import { NextResponse }    from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { d1Db }          from '@/lib/cloudflare/d1Compat'

export const dynamic = 'force-dynamic'

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const dbUser = await d1Db.user.findUnique({ where: { email: user.email! } })
      if (dbUser?.role === 'ADMIN') return true
    } catch { /* D1 unavailable */ }
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from('user_niche_profiles')
    .select('user_id, niche, analysis_count, percentage')
    .eq('user_id', userId)
    .order('analysis_count', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    user_id: userId,
    niches:  data ?? [],
  })
}
