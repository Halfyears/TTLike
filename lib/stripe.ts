import Stripe from 'stripe'
import { PAYMENT_ENABLED } from './constants'

// Guard: even if PAYMENT_ENABLED=true, don't crash if the key is absent (e.g. preview env)
export const stripe = (PAYMENT_ENABLED && process.env.STRIPE_SECRET_KEY)
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  : null

export async function createCheckoutSession(userId: string, plan: string, email: string) {
  if (!PAYMENT_ENABLED || !stripe) {
    throw new Error('Payment processing is not configured')
  }

  const priceIds: Record<string, string> = {
    PRO: process.env.STRIPE_PRO_PRICE_ID!,
    ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
  }

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: priceIds[plan], quantity: 1 }],
    metadata: { userId, plan },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?canceled=true`,
  })
}

export async function createCustomerPortalSession(stripeCustomerId: string) {
  if (!PAYMENT_ENABLED || !stripe) {
    throw new Error('Payment processing is not configured')
  }

  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  })
}
