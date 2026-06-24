/**
 * GET /api/admin/users/sources?source=xxx
 * Returns all users with the given referral_source.
 * source=__direct__ → users with no referral_source
 */

import { NextResponse }         from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') ?? ''
  const service = createServiceClient()

  let query = service
    .from('users')
    .select('id, email, name, role, referral_source, account_status')
    .order('email', { ascending: true })
    .limit(500)

  if (source === '__direct__') {
    query = query.is('referral_source', null)
  } else if (source) {
    query = query.eq('referral_source', source)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with subscription plan
  const userIds = (data ?? []).map((u: { id: string }) => u.id)
  const { data: subs } = await service
    .from('user_subscriptions')
    .select('user_id, plan, status')
    .in('user_id', userIds)

  const subMap = new Map((subs ?? []).map((s: { user_id: string; plan: string; status: string }) => [s.user_id, s]))

  const users = (data ?? []).map((u: Record<string, unknown>) => ({
    id:               u.id,
    email:            u.email,
    name:             u.name,
    role:             u.role,
    referral_source:  u.referral_source,
    account_status:   u.account_status ?? 'ACTIVE',
    plan:             subMap.get(u.id as string)?.plan ?? 'FREE',
    sub_status:       subMap.get(u.id as string)?.status ?? '',
  }))

  return NextResponse.json({ users, source, total: users.length })
}
