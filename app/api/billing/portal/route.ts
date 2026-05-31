/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for managing an existing subscription.
 * Returns { url } — the client redirects to this URL.
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createCustomerPortalSession } from '@/lib/stripe'
import { PAYMENT_ENABLED } from '@/lib/constants'

export async function POST() {
  if (!PAYMENT_ENABLED) {
    return NextResponse.json({ error: 'Payments not enabled' }, { status: 503 })
  }

  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: sub, error: subErr } = await service
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (subErr) {
    console.error('[billing/portal] DB error fetching subscription:', subErr.message)
    return NextResponse.json({ error: 'Failed to load subscription data' }, { status: 500 })
  }

  const stripeCustomerId = (sub as { stripe_customer_id?: string | null } | null)?.stripe_customer_id
  if (!stripeCustomerId) {
    return NextResponse.json({ error: 'No active Stripe subscription found' }, { status: 404 })
  }

  try {
    const session = await createCustomerPortalSession(stripeCustomerId)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/portal] Stripe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Portal session failed' },
      { status: 500 },
    )
  }
}
