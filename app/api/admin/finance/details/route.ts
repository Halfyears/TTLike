/**
 * GET /api/admin/finance/details
 *
 * Returns detail data for finance KPI drill-down drawers.
 *
 * Query params:
 *   ?type=subscription&plan=PRO|ENTERPRISE|FREE
 *     → list of users on that plan (email, name, id)
 *
 *   ?type=finops
 *     → top generators (user_id + email + name + generation count, all time)
 */

import { NextResponse }          from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma }                from '@/lib/prisma'
import { computeTokenCost }      from '@/lib/finance/metrics'

export const dynamic = 'force-dynamic'

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

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? ''
  const service = createServiceClient()

  // ── Subscription detail: list users by plan ─────────────────────────────────
  if (type === 'subscription') {
    const plan = searchParams.get('plan') ?? ''
    if (!['PRO', 'ENTERPRISE', 'FREE'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data, error } = await service
      .from('users')
      .select('id, email, name, plan, account_status')
      .eq('plan', plan)
      .order('email', { ascending: true })
      .limit(500)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      plan,
      users: (data ?? []).map((u: { id: string; email: string; name: string | null; plan: string; account_status: string | null }) => ({
        id:             u.id,
        email:          u.email,
        name:           u.name ?? null,
        plan:           u.plan,
        account_status: u.account_status ?? 'ACTIVE',
      })),
      total: (data ?? []).length,
    })
  }

  // ── FinOps detail: top generators (all time) ─────────────────────────────────
  if (type === 'finops') {
    const { data: ledger } = await service
      .from('ledger_event_kernel')
      .select('user_id, payload')
      .eq('event_type', 'COMPLETE')

    // Tally per user
    const stats = new Map<string, { gens: number; cost: number; cacheHits: number }>()
    for (const row of (ledger ?? []) as Array<{ user_id: string; payload: Record<string, unknown> }>) {
      const uid  = row.user_id as string
      const p    = row.payload ?? {}
      const cost = computeTokenCost(Number(p.tokens_consumed ?? 0) || null)
      const hit  = Boolean(p.from_cache)
      const cur  = stats.get(uid) ?? { gens: 0, cost: 0, cacheHits: 0 }
      stats.set(uid, { gens: cur.gens + 1, cost: cur.cost + cost, cacheHits: cur.cacheHits + (hit ? 1 : 0) })
    }

    // Enrich with user info
    const { data: users } = await service
      .from('users')
      .select('id, email, name, plan')

    const userMap = new Map((users ?? []).map((u: { id: string; email: string; name: string | null; plan: string }) => [u.id, u]))

    const ranked = Array.from(stats.entries())
      .map(([uid, s]) => {
        const u = userMap.get(uid)
        return {
          user_id:   uid,
          email:     u?.email ?? '(unknown)',
          name:      u?.name ?? null,
          plan:      u?.plan ?? 'FREE',
          gens:      s.gens,
          cost_usd:  s.cost,
          cache_hits: s.cacheHits,
        }
      })
      .sort((a, b) => b.gens - a.gens)
      .slice(0, 50)

    return NextResponse.json({ generators: ranked, total: stats.size })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
