/**
 * GET   /api/admin/users/[id]  — full user detail for admin inspection
 * PATCH /api/admin/users/[id]  — update user role and/or accountStatus
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

// ── GET — full user detail ────────────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const service = createServiceClient()

  // All queries in parallel — auth user is required, rest are optional
  const [authRes, appRes, subRes, profileRes, eventsRes, analyticsRes] = await Promise.all([
    service.auth.admin.getUserById(id),
    service.from('users').select('id, email, name, role, referral_source, plan').eq('id', id).maybeSingle(),
    service.from('user_subscriptions').select('plan, status, current_period_end, stripe_customer_id').eq('user_id', id).maybeSingle(),
    service.from('user_behavior_profiles').select('peak_hour, total_analyses, profile_label, time_segment_label, niche_label, updated_at').eq('user_id', id).maybeSingle(),
    service.from('ledger_event_kernel')
      .select('sequence_id, event_type, payload, emitted_at')
      .eq('user_id', id)
      .order('emitted_at', { ascending: false })
      .limit(30),
    service.from('user_analytics')
      .select('event, feature_name, context_data, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (authRes.error || !authRes.data.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const authUser = authRes.data.user
  const app      = appRes.data
  const sub      = subRes.data
  const profile  = profileRes.data
  const events   = eventsRes.data ?? []
  const analytics = analyticsRes.data ?? []

  // Summarise event activity from recent window
  // totalAnalyses: real-time count from fetched events (limited to last 30)
  // profile?.total_analyses: full aggregate from last recompute — used by profile card
  const recentCompleteCount = events.filter(e => (e as { event_type: string }).event_type === 'COMPLETE').length
  const scriptsGenerated    = analytics.filter(e => (e as { event: string }).event === 'script_generated').length

  return NextResponse.json({
    user: {
      id,
      email:           authUser.email ?? '',
      name:            (app?.name as string | null) ?? (authUser.user_metadata?.full_name as string | null) ?? null,
      role:            (app?.role as string) ?? 'USER',
      plan:            sub?.plan ?? (app?.plan as string | null) ?? 'FREE',
      sub_status:      sub?.status ?? 'ACTIVE',
      period_end:      sub?.current_period_end ?? null,
      stripe_id:       sub?.stripe_customer_id ?? null,
      email_confirmed: !!authUser.email_confirmed_at,
      created_at:      authUser.created_at,
      last_sign_in:    authUser.last_sign_in_at ?? null,
      referral_source: (app?.referral_source as string | null) ?? null,
    },
    profile: {
      peak_hour:          profile?.peak_hour                   ?? null,
      total_analyses:     profile?.total_analyses              ?? recentCompleteCount,
      profile_label:      profile?.profile_label               ?? null,
      time_segment_label: (profile as Record<string, unknown> | null)?.time_segment_label as string | null ?? null,
      niche_label:        (profile as Record<string, unknown> | null)?.niche_label        as string | null ?? null,
      updated_at:         profile?.updated_at                  ?? null,
    },
    activity: {
      // Prefer full aggregate from profile table; fall back to recent-window count
      total_analyses:    profile?.total_analyses ?? recentCompleteCount,
      scripts_generated: scriptsGenerated,
    },
    recent_events: (events as Array<{
      sequence_id: number; event_type: string
      payload: Record<string, unknown>; emitted_at: string
    }>).map(e => ({
      sequence_id: e.sequence_id,
      event_type:  e.event_type,
      tokens:      (() => { const tc = (e.payload as Record<string, unknown>)?.tokens_consumed; return (tc !== undefined && tc !== null) ? Number(tc) : null })(),
      from_cache:  Boolean((e.payload as Record<string, unknown>)?.from_cache),
      emitted_at:  e.emitted_at,
    })),
    recent_analytics: (analytics as Array<{
      event: string; feature_name: string | null
      context_data: Record<string, unknown> | null; created_at: string
    }>),
  })
}

// ── PATCH — update role and/or accountStatus ─────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as { role?: unknown; accountStatus?: unknown; plan?: unknown }
  const { role, accountStatus, plan } = body

  if (role !== undefined && (typeof role !== 'string' || !['USER', 'ADMIN'].includes(role))) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  const VALID_STATUSES = ['PENDING', 'ACTIVE', 'INACTIVE', 'DELETED']
  if (accountStatus !== undefined && (typeof accountStatus !== 'string' || !VALID_STATUSES.includes(accountStatus))) {
    return NextResponse.json({ error: 'Invalid accountStatus' }, { status: 400 })
  }
  const VALID_PLANS = ['FREE', 'PRO', 'ENTERPRISE']
  if (plan !== undefined && (typeof plan !== 'string' || !VALID_PLANS.includes(plan))) {
    return NextResponse.json({ error: 'Invalid plan. Must be FREE, PRO, or ENTERPRISE' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: { user: authUser }, error: authErr } = await service.auth.admin.getUserById(id)
  if (authErr || !authUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {
    id:        authUser.id,
    email:     authUser.email ?? '',
    updatedAt: new Date().toISOString(),   // required NOT NULL — Prisma @updatedAt, no DB default
  }
  if (role          !== undefined) updateData.role           = role
  if (accountStatus !== undefined) updateData.account_status = accountStatus
  if (plan          !== undefined) updateData.plan           = plan

  const { error } = await service.from('users').upsert(updateData, { onConflict: 'id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If plan changed, also update user_subscriptions and billing tier
  if (plan !== undefined) {
    const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch existing subscription to preserve stripe_customer_id (do NOT overwrite paying user's Stripe link)
    const { data: existingSub } = await service
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', id)
      .maybeSingle()

    // Upsert subscription row (admin override — preserve any existing Stripe customer ID)
    await service.from('user_subscriptions').upsert({
      user_id:             id,
      plan:                plan as string,
      status:              plan === 'FREE' ? 'CANCELED' : 'ACTIVE',
      current_period_end:  plan === 'FREE' ? null : periodEnd,
      stripe_customer_id:  (existingSub as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null,
    }, { onConflict: 'user_id' })

    // Update billing tier quota limits via RPC
    const tierName = plan === 'ENTERPRISE' ? 'scale' : plan === 'PRO' ? 'creator' : 'free'
    await service.rpc('set_user_tier', { uid: id, new_tier: tierName })
  }

  return NextResponse.json({ ok: true, id, role, accountStatus, plan })
}
