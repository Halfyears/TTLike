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
      .select('user_id, peak_hour, total_analyses, profile_label, updated_at')
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
    total_analyses: number; profile_label: string | null; updated_at: string
  }) => {
    const info  = infoByUser.get(p.user_id)
    const email = info?.email ?? emailByAuthId.get(p.user_id) ?? `[uid:${p.user_id.slice(0, 8)}…]`
    return {
      user_id:        p.user_id,
      email,
      plan:           info?.plan ?? 'FREE',
      peak_hour:      p.peak_hour,
      total_analyses: p.total_analyses,
      profile_label:  p.profile_label,
      updated_at:     p.updated_at,
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

  // Fetch all COMPLETE events: user_id + emitted_at
  const { data: events, error: evErr } = await service
    .from('ledger_event_kernel')
    .select('user_id, emitted_at')
    .eq('event_type', 'COMPLETE')
    .not('user_id', 'is', null)

  if (evErr) {
    return NextResponse.json({ error: evErr.message }, { status: 500 })
  }

  // Aggregate per user
  const userHours  = new Map<string, number[]>()
  const userCounts = new Map<string, number>()

  for (const row of (events ?? []) as Array<{ user_id: string; emitted_at: string }>) {
    const uid  = row.user_id
    const hour = new Date(row.emitted_at).getUTCHours()

    if (!userHours.has(uid)) userHours.set(uid, [])
    userHours.get(uid)!.push(hour)
    userCounts.set(uid, (userCounts.get(uid) ?? 0) + 1)
  }

  // Build upsert payload
  const profiles: Array<{
    user_id: string; peak_hour: number; total_analyses: number
    profile_label: string; updated_at: string
  }> = []

  for (const [uid, hours] of userHours.entries()) {
    const total = userCounts.get(uid) ?? 0

    // Peak hour — mode
    const freq: Record<number, number> = {}
    for (const h of hours) freq[h] = (freq[h] ?? 0) + 1
    const peakHour = parseInt(
      Object.entries(freq).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '9',
      10,
    )

    // Profile label
    let profileLabel: string
    if (total >= 50)       profileLabel = '高频操作手'
    else if (total >= 20)  profileLabel = '重度用户'
    else if (total >= 5)   profileLabel = '活跃用户'
    else                   profileLabel = '轻度探索者'

    profiles.push({
      user_id:        uid,
      peak_hour:      peakHour,
      total_analyses: total,
      profile_label:  profileLabel,
      updated_at:     new Date().toISOString(),
    })
  }

  if (profiles.length === 0) {
    return NextResponse.json({ updated: 0, message: 'No COMPLETE events found' })
  }

  const { error: upsertErr } = await service
    .from('user_behavior_profiles')
    .upsert(profiles, { onConflict: 'user_id' })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    updated:  profiles.length,
    message:  `Recomputed ${profiles.length} user profiles`,
    breakdown: {
      '高频操作手':  profiles.filter(p => p.profile_label === '高频操作手').length,
      '重度用户':    profiles.filter(p => p.profile_label === '重度用户').length,
      '活跃用户':    profiles.filter(p => p.profile_label === '活跃用户').length,
      '轻度探索者':  profiles.filter(p => p.profile_label === '轻度探索者').length,
    },
  })
}
