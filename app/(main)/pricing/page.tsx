import { Check, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { IS_BETA_PHASE, PAYMENT_ENABLED, SUBSCRIPTION_PLANS } from '@/lib/constants'

export const metadata = { title: 'Pricing · TTLike' }

const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: IS_BETA_PHASE ? 0 : SUBSCRIPTION_PLANS.FREE.price,
    description: 'Perfect to get started',
    features: [
      '50 product searches/day',
      '10 AI scripts/day',
      'Basic viral scores',
      'Hook library access',
      'Email support',
    ],
    cta: 'Get Started Free',
    href: '/auth/signup',
    highlight: false,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: IS_BETA_PHASE ? 0 : SUBSCRIPTION_PLANS.PRO.price,
    description: 'For serious TikTok sellers',
    features: [
      'Unlimited product searches',
      'Unlimited AI scripts',
      'Full viral analysis',
      'Hook pattern library',
      'Trend alerts',
      'Priority support',
      'CSV exports',
      'API access',
    ],
    cta: IS_BETA_PHASE ? 'Free During Beta' : 'Start Pro',
    href: '/auth/signup',
    highlight: true,
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    price: IS_BETA_PHASE ? 0 : SUBSCRIPTION_PLANS.ENTERPRISE.price,
    description: 'For agencies & large teams',
    features: [
      'Everything in Pro',
      'Team seats (5 users)',
      'White-label reports',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    cta: IS_BETA_PHASE ? 'Free During Beta' : 'Contact Sales',
    href: '/auth/signup',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
      {IS_BETA_PHASE && (
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-50 to-violet-50 border border-pink-200 text-pink-700 px-6 py-3 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Beta Phase Active · All Plans Are Currently FREE
          </div>
          <p className="text-gray-600 text-sm max-w-lg mx-auto">
            We&apos;re in beta (Month 1-3). Every user gets Pro-level access for free.
            Lock in your beta pricing before we launch.
          </p>
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-gray-600">Start free. Upgrade when you&apos;re ready.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => (
          <Card key={plan.key} className={plan.highlight ? 'border-pink-400 shadow-lg ring-2 ring-pink-400' : ''}>
            <CardContent className="p-6">
              {plan.highlight && (
                <div className="text-center mb-4">
                  <span className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
              <p className="text-gray-500 text-sm mt-1 mb-4">{plan.description}</p>

              <div className="mb-6">
                {IS_BETA_PHASE ? (
                  <div>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black text-gray-900">$0</span>
                      <span className="text-gray-500 text-sm mb-1">/mo</span>
                    </div>
                    {plan.key !== 'FREE' && (
                      <div className="text-xs text-gray-400 line-through">
                        ${SUBSCRIPTION_PLANS[plan.key as keyof typeof SUBSCRIPTION_PLANS].price}/mo after beta
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-gray-900">${plan.price}</span>
                    <span className="text-gray-500 text-sm mb-1">/mo</span>
                  </div>
                )}
              </div>

              <Link href={plan.href}>
                <Button className={`w-full mb-6 ${!plan.highlight ? 'bg-gray-900 hover:bg-gray-800' : ''}`}>
                  {plan.cta}
                </Button>
              </Link>

              <ul className="space-y-3">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
        <div className="max-w-2xl mx-auto space-y-4 text-left">
          {[
            { q: 'Is it really free during beta?', a: 'Yes! During our beta phase (first 3 months), all features are completely free with no credit card required.' },
            { q: 'What happens after beta?', a: 'You\'ll be notified before pricing changes. Beta users get exclusive early-bird pricing.' },
            { q: 'Can I cancel anytime?', a: 'Absolutely. No contracts, no commitments. Cancel with one click.' },
            { q: 'Do you support PayPal?', a: 'Yes, we accept both credit cards (via Stripe) and PayPal.' },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-gray-100 pb-4">
              <h4 className="font-medium text-gray-900 mb-1">{q}</h4>
              <p className="text-sm text-gray-600">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
