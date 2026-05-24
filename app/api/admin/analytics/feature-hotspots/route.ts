/**
 * GET /api/admin/analytics/feature-hotspots
 *
 * Aggregates feature_click_events and page_dwell_events for admin insight.
 * Returns:
 *   - Top features by click count (free vs paid breakdown)
 *   - Average dwell time per plan tier
 *   - Last 7 days of activity
 */

import { NextResponse }    from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma }          from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
      if (dbUser?.role === 'ADMIN') return true
    } catch { /* prisma unavailable */ }
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '7', 10)))
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const service = createServiceClient()

  const [clickRes, dwellRes] = await Promise.all([
    service
      .from('feature_click_events')
      .select('feature_name, plan, clicked_at')
      .gte('clicked_at', since),
    service
      .from('page_dwell_events')
      .select('page, plan, dwell_seconds, recorded_at')
      .gte('recorded_at', since),
  ])

  const clicks = (clickRes.data ?? []) as Array<{ feature_name: string; plan: string | null; clicked_at: string }>
  const dwells = (dwellRes.data ?? []) as Array<{ page: string; plan: string | null; dwell_seconds: number }>

  // Aggregate feature clicks
  const featureMap = new Map<string, { total: number; free: number; paid: number }>()
  for (const c of clicks) {
    if (!featureMap.has(c.feature_name)) featureMap.set(c.feature_name, { total: 0, free: 0, paid: 0 })
    const entry = featureMap.get(c.feature_name)!
    entry.total++
    const isPaid = c.plan && c.plan !== 'FREE'
    if (isPaid) { entry.paid++ } else { entry.free++ }
  }

  const features = Array.from(featureMap.entries())
    .map(([name, counts]) => ({ name, ...counts }))
    .sort((a, b) => b.total - a.total)

  // Average dwell time by plan
  const dwellByPlan: Record<string, { count: number; totalSec: number }> = {}
  for (const d of dwells) {
    const key = d.plan ?? 'FREE'
    if (!dwellByPlan[key]) dwellByPlan[key] = { count: 0, totalSec: 0 }
    dwellByPlan[key].count++
    dwellByPlan[key].totalSec += d.dwell_seconds
  }
  const avg_dwell = Object.entries(dwellByPlan).map(([plan, { count, totalSec }]) => ({
    plan,
    avg_seconds: count > 0 ? Math.round(totalSec / count) : 0,
    samples:     count,
  }))

  return NextResponse.json({
    period_days: days,
    total_click_events: clicks.length,
    features,
    avg_dwell,
    computed_at: new Date().toISOString(),
  })
}
