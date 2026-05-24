/**
 * GET /api/admin/users
 *
 * Returns all Supabase Auth users joined with:
 *   - users table  (role, name)
 *   - user_subscriptions (plan, status, period_end)
 *   - user_analytics     (scripts generated, last activity)
 *
 * Admin-only. Uses service-role client so it can call auth.admin.listUsers.
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
      if (dbUser?.role === 'ADMIN') return true
    } catch {}
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()

  // ── 1. All auth users ───────────────────────────────────────────────────────
  const { data: authData, error: authErr } = await service.auth.admin.listUsers({
    page: 1, perPage: 1000,
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  const authUsers = authData?.users ?? []
  if (authUsers.length === 0) return NextResponse.json({ users: [] })

  // ── 2. App-level roles / names ─────────────────────────────────────────────
  const { data: appRows } = await service
    .from('users')
    .select('id, email, name, role, referral_source')

  const appByEmail = new Map<string, Record<string, unknown>>()
  const appById    = new Map<string, Record<string, unknown>>()
  for (const r of (appRows ?? []) as Record<string, unknown>[]) {
    appByEmail.set(r.email as string, r)
    appById.set(r.id as string, r)
  }

  // ── 3. Subscriptions ───────────────────────────────────────────────────────
  const { data: subRows } = await service
    .from('user_subscriptions')
    .select('user_id, plan, status, current_period_end, stripe_customer_id')

  const subByUser = new Map<string, Record<string, unknown>>()
  for (const s of (subRows ?? []) as Record<string, unknown>[]) {
    subByUser.set(s.user_id as string, s)
  }

  // ── 4. Usage: scripts generated per user ──────────────────────────────────
  const { data: analyticsRows } = await service
    .from('user_analytics')
    .select('user_id, event, created_at')
    .order('created_at', { ascending: false })

  const scriptsByUser: Record<string, number> = {}
  const lastActivityByUser: Record<string, string> = {}
  for (const row of (analyticsRows ?? []) as Record<string, unknown>[]) {
    const uid = row.user_id as string
    if (row.event === 'script_generated') {
      scriptsByUser[uid] = (scriptsByUser[uid] ?? 0) + 1
    }
    if (!lastActivityByUser[uid]) {
      lastActivityByUser[uid] = row.created_at as string
    }
  }

  // ── 5. Merge ───────────────────────────────────────────────────────────────
  const users = authUsers.map(u => {
    // App user row may be keyed by either auth id or email
    const app = appById.get(u.id) ?? appByEmail.get(u.email ?? '') ?? {}
    const sub = subByUser.get(u.id) ?? {}

    return {
      id:            u.id,
      email:         u.email ?? '',
      name:          (app.name as string | null)
                     ?? (u.user_metadata?.full_name as string | null)
                     ?? null,
      role:          (app.role as string) ?? 'USER',
      plan:          (sub.plan as string) ?? 'FREE',
      sub_status:    (sub.status as string) ?? 'ACTIVE',
      period_end:    (sub.current_period_end as string | null) ?? null,
      stripe_id:     (sub.stripe_customer_id as string | null) ?? null,
      scripts_used:  scriptsByUser[u.id] ?? 0,
      last_activity: lastActivityByUser[u.id] ?? null,
      last_sign_in:  u.last_sign_in_at ?? null,
      confirmed:        !!u.email_confirmed_at,
      created_at:       u.created_at,
      referral_source:  (app.referral_source as string | null) ?? null,
    }
  })

  // Sort: most recent first
  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ users })
}
