import { Check, Zap, Sparkles, Shield } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { TIER_LIMITS } from '@/lib/constants'

export const metadata = { title: 'Pricing · TTLike' }

const PLANS = [
  {
    key:         'free',
    name:        'Free',
    price:       0,
    description: 'Try TTLike at no cost',
    icon:        Sparkles,
    iconColor:   'text-gray-400',
    highlight:   false,
    cta:         'Get Started Free',
    href:        '/auth/signup',
    features: [
      `${TIER_LIMITS.free.video_analysis} video analyses / month`,
      'AI Viral Breakdown (viral formulas + timeline)',
      'Production Insights panel',
      'SIGNAL trend badge',
      'Buyer Signals comments',
      'AI Script Generator (3 scripts/day)',
      'Hook library access',
    ],
    locked: [
      'AI Structural Health Report',
      'Anti-duplication hook variants',
      'CapCut script export',
      'Batch analysis',
    ],
  },
  {
    key:         'creator',
    name:        'Creator',
    price:       29,
    description: 'For serious TikTok sellers',
    icon:        Zap,
    iconColor:   'text-pink-500',
    highlight:   true,
    cta:         'Start Creator',
    href:        '/auth/signup',
    features: [
      `${TIER_LIMITS.creator.video_analysis} video analyses / month`,
      `${TIER_LIMITS.creator.strategy_audit} AI Structural Health Reports / month`,
      'All Free features',
      'Anti-duplication hook variants',
      'Full CapCut script export',
      'Unlimited AI scripts',
      'Trend alerts',
      'Priority support',
      'CSV exports',
    ],
    locked: [
      'White-label reports',
      'Team seats',
    ],
  },
  {
    key:         'scale',
    name:        'Scale',
    price:       99,
    description: 'For agencies & power sellers',
    icon:        Shield,
    iconColor:   'text-violet-500',
    highlight:   false,
    cta:         'Contact Sales',
    href:        '/auth/signup',
    features: [
      `${TIER_LIMITS.scale.video_analysis} video analyses / month`,
      `${TIER_LIMITS.scale.strategy_audit} AI Structural Health Reports / month`,
      'All Creator features',
      'White-label reports',
      'Team seats (5 users)',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'API access',
    ],
    locked: [],
  },
]

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-gray-600 mb-2">Start free. Upgrade when you&apos;re ready.</p>
        <p className="text-sm text-gray-400">No contracts. Cancel anytime.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const Icon = plan.icon
          return (
            <Card
              key={plan.key}
              className={plan.highlight ? 'border-pink-400 shadow-xl ring-2 ring-pink-400 relative' : 'relative'}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    MOST POPULAR
                  </span>
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                  <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                </div>
                <p className="text-gray-500 text-sm mb-5">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-gray-900">${plan.price}</span>
                    <span className="text-gray-500 text-sm mb-1">/mo</span>
                  </div>
                </div>

                <Link href={plan.href}>
                  <Button className={`w-full mb-6 ${!plan.highlight ? 'bg-gray-900 hover:bg-gray-800' : ''}`}>
                    {plan.cta}
                  </Button>
                </Link>

                <ul className="space-y-2.5">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                  {plan.locked.map(feature => (
                    <li key={feature} className="flex items-start gap-2 opacity-40">
                      <Check className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-500 line-through">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
        <div className="max-w-2xl mx-auto space-y-4 text-left">
          {[
            {
              q: 'What counts as a video analysis?',
              a: 'Each unique TikTok video URL analyzed via the Inspiration Engine counts as one use. Cached results (same video analyzed again) do not consume additional quota.',
            },
            {
              q: 'Do unused analyses roll over?',
              a: 'Quotas reset on the 1st of each month. Unused analyses do not carry over.',
            },
            {
              q: 'Can I upgrade or downgrade anytime?',
              a: 'Yes. Upgrades take effect immediately. Downgrades apply at the next billing cycle.',
            },
            {
              q: 'Do you support PayPal?',
              a: 'Yes, we accept both credit cards (via Stripe) and PayPal.',
            },
            {
              q: 'What is the AI Structural Health Report?',
              a: 'A forensic audit of a viral video covering Hook Retention Mechanics, Trust Blueprint, Structural Leak Detection, and a zero-cost Counter-Attack Manual — exclusive to Creator and Scale tiers.',
            },
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
