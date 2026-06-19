/**
 * GET /api/admin/analytics/upgrade-attribution
 *
 * Shows which psychological triggers and insights most frequently
 * precede upgrade CTA clicks, helping prioritise paywall copy.
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
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10)))
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const service = createServiceClient()

  const { data: events } = await service
    .from('upgrade_trigger_events')
    .select('user_id, trigger_type, cta_label, page, video_id, insight_label, triggered_at')
    .gte('triggered_at', since)
    .order('triggered_at', { ascending: false })

  const rows = (events ?? []) as Array<{
    user_id:       string
    trigger_type:  string
    cta_label:     string | null
    page:          string | null
    video_id:      string | null
    insight_label: string | null
    triggered_at:  string
  }>

  // Aggregate by trigger_type
  const byType: Record<string, number> = {}
  for (const r of rows) {
    byType[r.trigger_type] = (byType[r.trigger_type] ?? 0) + 1
  }

  // Aggregate by CTA label
  const byCta: Record<string, number> = {}
  for (const r of rows) {
    const key = r.cta_label ?? '(unknown)'
    byCta[key] = (byCta[key] ?? 0) + 1
  }

  // Aggregate by page
  const byPage: Record<string, number> = {}
  for (const r of rows) {
    const key = r.page ?? 'unknown'
    byPage[key] = (byPage[key] ?? 0) + 1
  }

  // Unique users who clicked upgrade
  const uniqueUsers = new Set(rows.map(r => r.user_id)).size

  return NextResponse.json({
    period_days:  days,
    total_clicks: rows.length,
    unique_users: uniqueUsers,
    by_trigger_type: Object.entries(byType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    by_cta: Object.entries(byCta)
      .map(([cta, count]) => ({ cta, count }))
      .sort((a, b) => b.count - a.count),
    by_page: Object.entries(byPage)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count),
    recent: rows.slice(0, 20),
    computed_at: new Date().toISOString(),
  })
}
