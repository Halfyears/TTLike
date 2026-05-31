/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session for upgrading to Creator or Scale plan.
 * Returns { url } — the client redirects to this URL.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession, SLUG_TO_PLAN } from '@/lib/stripe'
import { PAYMENT_ENABLED } from '@/lib/constants'

export async function POST(req: NextRequest) {
  if (!PAYMENT_ENABLED) {
    return NextResponse.json({ error: 'Payments not enabled' }, { status: 503 })
  }

  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: { plan?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { plan } = body
  if (!plan || !SLUG_TO_PLAN[plan]) {
    return NextResponse.json({ error: 'plan must be "creator" or "scale"' }, { status: 400 })
  }

  if (!user.email) {
    return NextResponse.json({ error: 'Account email required for checkout. Please add an email to your account.' }, { status: 400 })
  }

  try {
    const session = await createCheckoutSession(
      user.id,
      plan,
      user.email,
    )
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[checkout] Stripe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 },
    )
  }
}
