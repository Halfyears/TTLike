/**
 * GET /api/admin/finance
 *
 * Aggregates all financial data for the Finance dashboard:
 *   1. stripe      — account status + config health
 *   2. subscriptions — plan distribution, MRR, affiliate net revenue
 *   3. token_finops  — daily AI cost vs subscription revenue (last 30 days)
 *   4. ltv_ranking   — top 100 users by net contribution (LTV − COGS)
 *
 * Uses service-role client throughout (bypasses RLS).
 * Requires admin authentication (same isAdmin() pattern as /api/admin/users).
 */

import { NextResponse }          from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma }                from '@/lib/prisma'
import { stripe }                from '@/lib/stripe'
import {
  computeTokenCost, planMonthlyValue, PLAN_MONTHLY_VALUE,
} from '@/lib/finance/metrics'
import type { FinanceData }      from '@/lib/finance/types'

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

// FinanceData is defined in @/lib/finance/types — imported above.

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()

  // ── 1. Stripe account status ─────────────────────────────────────────────────
  let stripeInfo: FinanceData['stripe'] = {
    enabled: false, account_name: null, charges_enabled: null, error: null,
  }
  if (stripe) {
    try {
      // retrieve() with no args fetches the platform account; cast via unknown to satisfy newer SDK types
      const acct = await (stripe.accounts.retrieve as unknown as () => Promise<{ business_profile?: { name?: string | null }; email?: string | null; charges_enabled?: boolean | null }>)()
      stripeInfo = {
        enabled:         true,
        account_name:    acct.business_profile?.name ?? acct.email ?? null,
        charges_enabled: acct.charges_enabled ?? null,
        error:           null,
      }
    } catch (e) {
      stripeInfo = {
        enabled:         true,
        account_name:    null,
        charges_enabled: null,
        error:           e instanceof Error ? e.message : 'Stripe API error',
      }
    }
  }

  // ── 2. Subscriptions ─────────────────────────────────────────────────────────
  const [planRes, affRes] = await Promise.all([
    service.from('users').select('plan'),
    service.from('affiliate_links').select('revenue').eq('is_active', true),
  ])

  const planMap: Record<string, number> = {}
  for (const u of (planRes.data ?? []) as Array<{ plan: string }>) {
    planMap[u.plan] = (planMap[u.plan] ?? 0) + 1
  }
  const planCreator = planMap['PRO']        ?? 0
  const planScale   = planMap['ENTERPRISE'] ?? 0
  const planFree    = planMap['FREE']        ?? 0
  const estMRR      = planCreator * PLAN_MONTHLY_VALUE['PRO']!
                    + planScale   * PLAN_MONTHLY_VALUE['ENTERPRISE']!

  const affSpend = (affRes.data ?? []).reduce((s, r) => {
    const rev = typeof r.revenue === 'number' ? r.revenue : Number(r.revenue ?? 0)
    return s + (isNaN(rev) ? 0 : rev)
  }, 0)

  // ── 3. Token FinOps (last 30 days) ────────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const { data: ledgerRows } = await service
    .from('ledger_event_kernel')
    .select('user_id, payload, emitted_at')
    .eq('event_type', 'COMPLETE')
    .gte('emitted_at', thirtyDaysAgo)
    .order('emitted_at', { ascending: true })

  // Build daily buckets
  const dayMap = new Map<string, { cost: number; gens: number }>()
  let totalCost = 0
  let totalGens = 0

  for (const row of (ledgerRows ?? []) as Array<{
    user_id: string; payload: Record<string, unknown>; emitted_at: string
  }>) {
    const p      = row.payload ?? {}
    const tokens = Number(p.tokens_consumed ?? 0) || null
    const cost   = computeTokenCost(tokens)
    const day    = (row.emitted_at as string).slice(0, 10)

    totalCost += cost
    totalGens += 1

    const bucket = dayMap.get(day) ?? { cost: 0, gens: 0 }
    dayMap.set(day, { cost: bucket.cost + cost, gens: bucket.gens + 1 })
  }

  // Fill all 30 days (zero for days with no activity)
  const daily: FinanceData['token_finops']['daily'] = []
  const dailyMRRFraction = estMRR / 30   // uniform daily slice of MRR
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(Date.now() - i * 86_400_000)
    const key = d.toISOString().slice(0, 10)
    const b   = dayMap.get(key) ?? { cost: 0, gens: 0 }
    daily.push({
      date:         key,
      cost_usd:     b.cost,
      generations:  b.gens,
      mrr_fraction: dailyMRRFraction,
    })
  }

  // ── 4. User LTV / COGS ranking (all time) ─────────────────────────────────────
  const { data: allLedger } = await service
    .from('ledger_event_kernel')
    .select('user_id, payload')
    .eq('event_type', 'COMPLETE')

  // Tally per user
  const userStats = new Map<string, { gens: number; cost: number; cacheHits: number }>()
  for (const row of (allLedger ?? []) as Array<{
    user_id: string; payload: Record<string, unknown>
  }>) {
    const uid    = row.user_id as string
    const p      = row.payload ?? {}
    const tokens = Number(p.tokens_consumed ?? 0) || null
    const cost   = computeTokenCost(tokens)
    const hit    = Boolean(p.from_cache)

    const cur = userStats.get(uid) ?? { gens: 0, cost: 0, cacheHits: 0 }
    userStats.set(uid, {
      gens:      cur.gens + 1,
      cost:      cur.cost + cost,
      cacheHits: cur.cacheHits + (hit ? 1 : 0),
    })
  }

  // Join with user plan data
  const { data: userPlanRows } = await service
    .from('users')
    .select('id, email, name, plan')

  // Build auth user map (email + display name) — fallback when users table row is missing
  const authUserMap = new Map<string, { email: string; name: string | null }>()
  try {
    let page = 1
    for (;;) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 })
      if (error || !data) break
      for (const au of data.users) {
        const metaName = ((au.user_metadata?.full_name ?? au.user_metadata?.name ?? '') as string).trim()
        authUserMap.set(au.id, { email: au.email ?? '', name: metaName || null })
      }
      if (data.users.length < 1000) break
      page++
    }
  } catch { /* non-fatal */ }

  const planByUser = new Map<string, { email: string; name: string | null; plan: string }>()
  for (const u of (userPlanRows ?? []) as Array<{ id: string; email: string; name: string | null; plan: string }>) {
    // Prefer users.name → auth user_metadata name → null
    const resolvedName = (u.name as string | null)?.trim() || authUserMap.get(u.id)?.name || null
    planByUser.set(u.id, { email: u.email, name: resolvedName, plan: u.plan })
  }

  // Build ranking (only users who have generated at least once)
  const ranking: FinanceData['ltv_ranking'] = []
  for (const [uid, stats] of userStats.entries()) {
    const userInfo   = planByUser.get(uid)
    const plan       = userInfo?.plan ?? 'FREE'
    const planValue  = planMonthlyValue(plan)
    const netUsd     = planValue - stats.cost

    // Label classification (whale checked before at_risk so high-cache paid users aren't misclassified)
    let label: FinanceData['ltv_ranking'][number]['label']
    if (plan === 'FREE' && stats.cost > 0.05)                        label = 'freeloader'
    else if (planValue >= 29 && stats.cacheHits > stats.gens * 0.5) label = 'whale'
    else if (netUsd < 0)                                             label = 'at_risk'
    else                                                             label = 'healthy'

    const authFallback = authUserMap.get(uid)
    ranking.push({
      user_id:    uid,
      email:      userInfo?.email ?? authFallback?.email ?? '(unknown)',
      name:       userInfo?.name ?? authFallback?.name ?? null,
      plan,
      plan_value: planValue,
      generations: stats.gens,
      cogs_usd:   stats.cost,
      net_usd:    netUsd,
      cache_hits: stats.cacheHits,
      label,
    })
  }

  // Sort by net_usd descending (high value first), then by cost ascending
  ranking.sort((a, b) => b.net_usd - a.net_usd || a.cogs_usd - b.cogs_usd)

  return NextResponse.json({
    stripe:       stripeInfo,
    subscriptions: {
      total_paid:      planCreator + planScale,
      plan_creator:    planCreator,
      plan_scale:      planScale,
      plan_free:       planFree,
      est_mrr:         estMRR,
      affiliate_spend: affSpend,
      net_mrr:         estMRR - affSpend,
    },
    token_finops: {
      total_cost_usd:    totalCost,
      total_generations: totalGens,
      daily,
    },
    ltv_ranking: ranking.slice(0, 100),
  } satisfies FinanceData)
}
