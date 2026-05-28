/**
 * GET  /api/admin/analytics/operator-profiles
 *   Returns computed user_behavior_profiles joined with users (email, plan).
 *
 * POST /api/admin/analytics/operator-profiles
 *   Recomputes all profiles from ledger_event_kernel (COMPLETE events).
 *   Profile labels:
 *     高频操作手  → ≥ 50 analyses
 *     重度用户    → 20–49
 *     活跃用户    →  5–19
 *     轻度探索者  →  1– 4
 */

import { NextResponse }                    from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma }                           from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── Auth guard ────────────────────────────────────────────────────────────────
async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
      if (dbUser?.role === 'ADMIN') return true
    } catch { /* prisma not available */ }
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

// ── GET — fetch stored profiles ───────────────────────────────────────────────
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()

  // Load profiles and custom users table in parallel.
  // Auth users are fetched with full pagination (Supabase max perPage=1000 per call).
  const [profileRes, userRes] = await Promise.all([
    service
      .from('user_behavior_profiles')
      .select('user_id, peak_hour, total_analyses, profile_label, time_segment_label, niche_label, updated_at')
      .order('total_analyses', { ascending: false }),
    service
      .from('users')
      .select('id, email, plan'),
  ])

  // Paginate through auth.admin.listUsers to get ALL users (handles >1000 accounts)
  const allAuthUsers: Array<{ id: string; email?: string }> = []
  let page = 1
  for (;;) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data) break
    allAuthUsers.push(...data.users)
    if (data.users.length < 1000) break   // last page
    page++
  }

  // Primary: custom users table (has plan info)
  const infoByUser = new Map<string, { email: string; plan: string }>()
  for (const u of (userRes.data ?? []) as Array<{ id: string; email: string; plan: string }>) {
    infoByUser.set(u.id, { email: u.email, plan: u.plan })
  }

  // Fallback: auth system — guarantees email even if custom users row is missing
  const emailByAuthId = new Map<string, string>()
  for (const u of allAuthUsers) {
    if (u.email) emailByAuthId.set(u.id, u.email)
  }

  const profiles = (profileRes.data ?? []).map((p: {
    user_id: string; peak_hour: number | null
    total_analyses: number; profile_label: string | null
    time_segment_label: string | null; niche_label: string | null
    updated_at: string
  }) => {
    const info  = infoByUser.get(p.user_id)
    const email = info?.email ?? emailByAuthId.get(p.user_id) ?? '(unknown user)'
    return {
      user_id:            p.user_id,
      email,
      plan:               info?.plan ?? 'FREE',
      peak_hour:          p.peak_hour,
      total_analyses:     p.total_analyses,
      profile_label:      p.profile_label,
      time_segment_label: (p.time_segment_label as string | null) ?? null,
      niche_label:        (p.niche_label        as string | null) ?? null,
      updated_at:         p.updated_at,
    }
  })

  return NextResponse.json({ profiles, computed_at: new Date().toISOString() })
}

// ── POST — recompute all profiles ─────────────────────────────────────────────
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()

  // Fetch all COMPLETE events + niche analytics in parallel
  const [eventsRes, nicheRes] = await Promise.all([
    service
      .from('ledger_event_kernel')
      .select('user_id, emitted_at')
      .eq('event_type', 'COMPLETE')
      .not('user_id', 'is', null),
    // REQ-5: niche events logged by /api/analyze with event='analysis_complete', feature_name=niche
    service
      .from('user_analytics')
      .select('user_id, feature_name')
      .eq('event', 'analysis_complete')
      .not('feature_name', 'is', null),
  ])

  if (eventsRes.error) {
    return NextResponse.json({ error: eventsRes.error.message }, { status: 500 })
  }

  // ── Aggregate per user from ledger events ────────────────────────────────────
  const userHours  = new Map<string, number[]>()
  const userCounts = new Map<string, number>()

  for (const row of (eventsRes.data ?? []) as Array<{ user_id: string; emitted_at: string }>) {
    const uid  = row.user_id
    const hour = new Date(row.emitted_at).getUTCHours()
    if (!userHours.has(uid)) userHours.set(uid, [])
    userHours.get(uid)!.push(hour)
    userCounts.set(uid, (userCounts.get(uid) ?? 0) + 1)
  }

  // ── Aggregate niche distribution per user (REQ-5) ────────────────────────────
  const userNiches = new Map<string, Map<string, number>>()
  for (const row of (nicheRes.data ?? []) as Array<{ user_id: string; feature_name: string }>) {
    if (!userNiches.has(row.user_id)) userNiches.set(row.user_id, new Map())
    const nm = userNiches.get(row.user_id)!
    nm.set(row.feature_name, (nm.get(row.feature_name) ?? 0) + 1)
  }

  // Niche label helper
  function computeNicheLabel(nicheMap: Map<string, number>): string | null {
    const total = Array.from(nicheMap.values()).reduce((a, b) => a + b, 0)
    if (total === 0) return null
    const sorted = Array.from(nicheMap.entries()).sort(([, a], [, b]) => b - a)
    const [topNiche, topCount] = sorted[0]
    const pct = (topCount / total) * 100
    if (pct >= 60) {
      const lower = topNiche.toLowerCase()
      if (lower.includes('home') || lower.includes('garden'))   return '家居垂直大卖'
      if (lower.includes('beauty') || lower.includes('skin'))   return '美妆矩阵玩家'
      if (lower.includes('food') || lower.includes('kitchen'))  return '美食达人'
      if (lower.includes('fitness') || lower.includes('health')) return '健身达人'
      if (lower.includes('tech') || lower.includes('gadget'))   return '科技极客'
      if (lower.includes('fashion') || lower.includes('style')) return '时尚玩家'
      if (lower.includes('pet'))                                 return '宠物博主'
      return `${topNiche}达人`
    }
    return '多品类探索者'
  }

  // Time segment helper (REQ-4)
  function computeTimeSegment(peakHour: number): string {
    if (peakHour >= 6  && peakHour < 11) return '早起型创作者'
    if (peakHour >= 11 && peakHour < 15) return '午间活跃'
    if (peakHour >= 15 && peakHour < 19) return '下午场'
    if (peakHour >= 19 && peakHour < 24) return '夜猫子'
    return '深夜玩家'  // 0-5
  }

  // ── Build upsert payload ─────────────────────────────────────────────────────
  const profiles: Array<{
    user_id: string; peak_hour: number; total_analyses: number
    profile_label: string; time_segment_label: string; niche_label: string | null
    updated_at: string
  }> = []

  for (const [uid, hours] of userHours.entries()) {
    const total = userCounts.get(uid) ?? 0

    // Peak hour — mode of UTC hours
    const freq: Record<number, number> = {}
    for (const h of hours) freq[h] = (freq[h] ?? 0) + 1
    const peakHour = parseInt(
      Object.entries(freq).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '9', 10,
    )

    // Volume label
    let profileLabel: string
    if (total >= 50)      profileLabel = '高频操作手'
    else if (total >= 20) profileLabel = '重度用户'
    else if (total >= 5)  profileLabel = '活跃用户'
    else                  profileLabel = '轻度探索者'

    // REQ-4: time segment
    const timeSegmentLabel = computeTimeSegment(peakHour)

    // REQ-5: niche label (null if no niche data yet)
    const nicheMap   = userNiches.get(uid)
    const nicheLabel = nicheMap ? computeNicheLabel(nicheMap) : null

    profiles.push({
      user_id:            uid,
      peak_hour:          peakHour,
      total_analyses:     total,
      profile_label:      profileLabel,
      time_segment_label: timeSegmentLabel,
      niche_label:        nicheLabel,
      updated_at:         new Date().toISOString(),
    })
  }

  if (profiles.length === 0) {
    return NextResponse.json({ updated: 0, message: 'No COMPLETE events found' })
  }

  // ── Upsert behavior profiles ─────────────────────────────────────────────────
  const { error: upsertErr } = await service
    .from('user_behavior_profiles')
    .upsert(profiles, { onConflict: 'user_id' })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  // ── Upsert niche distribution table (REQ-5) ──────────────────────────────────
  const nicheRows: Array<{
    user_id: string; niche: string; analysis_count: number
    percentage: number; last_updated: string
  }> = []
  for (const [uid, nicheMap] of userNiches.entries()) {
    const total = Array.from(nicheMap.values()).reduce((a, b) => a + b, 0)
    for (const [niche, count] of nicheMap.entries()) {
      nicheRows.push({
        user_id:        uid,
        niche,
        analysis_count: count,
        percentage:     total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
        last_updated:   new Date().toISOString(),
      })
    }
  }
  if (nicheRows.length > 0) {
    // Batch upsert in chunks of 500 to stay within Supabase limits
    for (let i = 0; i < nicheRows.length; i += 500) {
      await service
        .from('user_niche_profiles')
        .upsert(nicheRows.slice(i, i + 500), { onConflict: 'user_id, niche' })
    }
  }

  return NextResponse.json({
    updated:  profiles.length,
    message:  `Recomputed ${profiles.length} user profiles`,
    breakdown: {
      '高频操作手': profiles.filter(p => p.profile_label === '高频操作手').length,
      '重度用户':   profiles.filter(p => p.profile_label === '重度用户').length,
      '活跃用户':   profiles.filter(p => p.profile_label === '活跃用户').length,
      '轻度探索者': profiles.filter(p => p.profile_label === '轻度探索者').length,
    },
    time_segments: {
      '早起型创作者': profiles.filter(p => p.time_segment_label === '早起型创作者').length,
      '午间活跃':     profiles.filter(p => p.time_segment_label === '午间活跃').length,
      '下午场':       profiles.filter(p => p.time_segment_label === '下午场').length,
      '夜猫子':       profiles.filter(p => p.time_segment_label === '夜猫子').length,
      '深夜玩家':     profiles.filter(p => p.time_segment_label === '深夜玩家').length,
    },
    niche_profiled: nicheRows.length > 0 ? new Set(nicheRows.map(r => r.user_id)).size : 0,
  })
}
