import Stripe from 'stripe'
import { PAYMENT_ENABLED } from './constants'

// Guard: even if PAYMENT_ENABLED=true, don't crash if the key is absent (e.g. preview env)
export const stripe = (PAYMENT_ENABLED && process.env.STRIPE_SECRET_KEY)
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  : null

// ── Plan ↔ Tier mapping (Prisma enum ↔ billing tier) ─────────────────────────
// Prisma SubscriptionPlan: FREE | PRO | ENTERPRISE
// user_billing_tiers.tier_name: free | creator | scale
export const PLAN_TO_TIER: Record<string, string> = {
  FREE:       'free',
  PRO:        'creator',
  ENTERPRISE: 'scale',
}

// Pricing page plan slugs → Prisma plan
export const SLUG_TO_PLAN: Record<string, string> = {
  creator: 'PRO',
  scale:   'ENTERPRISE',
}

export async function createCheckoutSession(userId: string, planSlug: string, email: string) {
  if (!PAYMENT_ENABLED || !stripe) {
    throw new Error('Payment processing is not configured')
  }

  const priceIds: Record<string, string | undefined> = {
    creator: process.env.STRIPE_CREATOR_PRICE_ID,
    scale:   process.env.STRIPE_SCALE_PRICE_ID,
  }

  const priceId = priceIds[planSlug]
  if (!priceId) throw new Error(`No Stripe price configured for plan: ${planSlug}`)

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, plan: SLUG_TO_PLAN[planSlug] ?? planSlug },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=1`,
    cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
  })
}

export async function createCustomerPortalSession(stripeCustomerId: string) {
  if (!PAYMENT_ENABLED || !stripe) {
    throw new Error('Payment processing is not configured')
  }

  return stripe.billingPortal.sessions.create({
    customer:   stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/usage`,
  })
}
