import Stripe from 'stripe'
import { PAYMENT_ENABLED } from './constants'

export const stripe = PAYMENT_ENABLED
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  : null

export async function createCheckoutSession(userId: string, plan: string, email: string) {
  if (!PAYMENT_ENABLED || !stripe) {
    throw new Error('Payments are disabled during beta phase')
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
    throw new Error('Payments are disabled during beta phase')
  }

  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  })
}
