/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe subscription lifecycle events and syncs to DB:
 *   checkout.session.completed              → backfill stripe_customer_id on first purchase
 *   customer.subscription.created / updated → upsert user_subscriptions + set_user_tier
 *   customer.subscription.deleted           → downgrade to FREE
 */

import { NextResponse } from 'next/server'
import { PAYMENT_ENABLED } from '@/lib/constants'
import { PLAN_TO_TIER } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

// ── DB helpers ────────────────────────────────────────────────────────────────

async function syncSubscription(sub: Stripe.Subscription, userId: string) {
  const service  = createServiceClient()
  const plan     = (sub.metadata?.plan as string | undefined) ?? 'FREE'
  const tierName = PLAN_TO_TIER[plan] ?? 'free'
  const now      = new Date().toISOString()

  const statusMap: Record<string, string> = {
    active:             'ACTIVE',
    trialing:           'TRIALING',
    past_due:           'PAST_DUE',
    canceled:           'CANCELED',
    unpaid:             'CANCELED',
    incomplete:         'PAST_DUE',
    incomplete_expired: 'CANCELED',
    paused:             'CANCELED',
  }
  const status    = statusMap[sub.status] ?? 'ACTIVE'
  const periodEnd = sub.items.data[0]?.current_period_end
    ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
    : null

  const { error: subErr } = await service.from('user_subscriptions').upsert({
    user_id:            userId,
    plan,
    status,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : null,
    stripe_sub_id:      sub.id,
    current_period_end: periodEnd,
    updated_at:         now,
  }, { onConflict: 'user_id' })

  if (subErr) {
    console.error('[webhook] user_subscriptions upsert failed:', subErr.message)
    return
  }

  const { error: tierErr } = await service.rpc('set_user_tier', { uid: userId, new_tier: tierName })
  if (tierErr) console.error('[webhook] set_user_tier failed:', tierErr.message)
}

async function downgradeToFree(userId: string) {
  const service = createServiceClient()
  await service.from('user_subscriptions').upsert({
    user_id:            userId,
    plan:               'FREE',
    status:             'CANCELED',
    current_period_end: null,
    updated_at:         new Date().toISOString(),
  }, { onConflict: 'user_id' })

  await service.rpc('set_user_tier', { uid: userId, new_tier: 'free' })
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!PAYMENT_ENABLED) {
    return NextResponse.json({ message: 'Payments not enabled' }, { status: 200 })
  }

  const { stripe } = await import('@/lib/stripe')
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const body      = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId  = session.metadata?.userId
        if (!userId || !session.subscription) break

        // Retrieve full subscription; attach userId to metadata for future events
        const sub = await stripe.subscriptions.retrieve(session.subscription as string, {
          expand: ['items.data'],
        })
        if (!sub.metadata?.userId) {
          await stripe.subscriptions.update(sub.id, { metadata: { ...sub.metadata, userId } })
        }
        await syncSubscription({ ...sub, metadata: { ...sub.metadata, userId } }, userId)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) {
          console.warn('[webhook] subscription missing userId metadata:', sub.id)
          break
        }
        await syncSubscription(sub, userId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break
        await downgradeToFree(userId)
        break
      }

      default:
        break
    }
  } catch (err) {
    // Return 200 to prevent Stripe retries; log for manual review
    console.error('[webhook] handler error for', event.type, ':', err)
  }

  return NextResponse.json({ received: true })
}
