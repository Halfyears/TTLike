/**
 * GET /api/admin/sitemap/status
 *
 * Returns the most recent sitemap submission event for the current admin.
 * Reads from user_analytics where event = 'sitemap_submit'.
 * Auth: admin only.
 */

import { NextResponse }                      from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { d1Db }                            from '@/lib/cloudflare/d1Compat'

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

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from('user_analytics')
    .select('created_at, context_data')
    .eq('event', 'sitemap_submit')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ last_submitted_at: null, results: null })
  }

  return NextResponse.json({
    last_submitted_at: data?.created_at ?? null,
    results:           (data?.context_data as { results?: unknown } | null)?.results ?? null,
  })
}
