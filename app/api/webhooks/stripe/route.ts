import { NextResponse } from 'next/server'
import { PAYMENT_ENABLED } from '@/lib/constants'

export async function POST(request: Request) {
  if (!PAYMENT_ENABLED) {
    return NextResponse.json({ message: 'Payments not enabled' }, { status: 200 })
  }

  // Full Stripe webhook handling (activated when PAYMENT_ENABLED = true)
  const { stripe } = await import('@/lib/stripe')
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 })
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // Update user subscription in DB
        console.log('Subscription event:', event.type, event.data.object)
        break
      }
      case 'customer.subscription.deleted': {
        console.log('Subscription canceled:', event.data.object)
        break
      }
      default:
        console.log('Unhandled Stripe event:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 })
  }
}
