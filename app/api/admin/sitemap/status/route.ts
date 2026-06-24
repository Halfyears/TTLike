/**
 * GET /api/admin/sitemap/status
 *
 * Returns the most recent sitemap submission event for the current admin.
 * Reads from user_analytics where event = 'sitemap_submit'.
 * Auth: admin only.
 */

import { NextResponse }                      from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isCurrentUserAdmin())) {
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
