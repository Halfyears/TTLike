import { Check, X, Zap, Sparkles, Shield, Video, FileText, ListChecks, Lightbulb } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { TIER_LIMITS, SITE_URL } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import { PricingCheckoutButton } from '@/components/pricing/PricingCheckoutButton'

export const metadata = {
  title:       'Pricing · TTLike',
  description: 'From viral product discovery to shoot-ready action. Free plan includes 5 shoot-ready outputs/month. Creator ($39/mo) and Scale ($99/mo) for serious TikTok sellers and teams.',
  alternates:  { canonical: `${SITE_URL}/pricing` },
}

const PLANS = [
  {
    key:         'free',
    name:        'Free',
    price:       0,
    tagline:     'Try the full workflow',
    description: 'Experience one complete Find → Script → Prepare cycle at no cost.',
    icon:        Sparkles,
    iconColor:   'text-gray-400',
    highlight:   false,
    cta:         'Get Started Free',
    planSlug:    null as null | 'creator' | 'scale',
    features: [
      `${TIER_LIMITS.free.video_analysis} shoot-ready outputs / month`,
      'Viral product discovery (Product Database)',
      'AI Viral Breakdown (hooks + formulas)',
      'AI Script Generator',
      'Pre-Shoot Checklist',
      'Hook Library access',
      'Trending products feed',
    ],
    locked: [
      'Anti-duplication hook variants',
      'CapCut script export',
      'Batch analysis',
      'CSV export',
      'Trend alerts',
    ],
  },
  {
    key:         'creator',
    name:        'Creator',
    price:       39,
    tagline:     'Build a repeatable content engine',
    description: 'For TikTok sellers and UGC creators turning viral products into weekly content.',
    icon:        Zap,
    iconColor:   'text-pink-500',
    highlight:   true,
    cta:         'Start Creator',
    planSlug:    'creator' as 'creator' | 'scale',
    features: [
      `${TIER_LIMITS.creator.video_analysis} shoot-ready outputs / month`,
      'Everything in Free',
      'Anti-duplication hook variants',
      'Full CapCut script export',
      'Batch analysis',
      'CSV export',
      'Daily trend alerts',
      'Unlimited saved products',
      'Priority support',
    ],
    locked: [
      'White-label reports',
      'Team seats',
      'API access',
    ],
  },
  {
    key:         'scale',
    name:        'Scale',
    price:       99,
    tagline:     'Prepare at scale for teams',
    description: 'For agencies and TikTok Shop teams researching products and prepping content in bulk.',
    icon:        Shield,
    iconColor:   'text-violet-500',
    highlight:   false,
    cta:         'Get Scale',
    planSlug:    'scale' as 'creator' | 'scale',
    features: [
      `${TIER_LIMITS.scale.video_analysis} shoot-ready outputs / month`,
      'Everything in Creator',
      'White-label reports',
      'Team seats (5 users)',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    locked: [],
  },
]

// What's inside a shoot-ready output
const OUTPUT_STEPS = [
  {
    icon:  Video,
    color: 'text-pink-500',
    bg:    'bg-pink-50',
    title: 'Viral Product Opportunity',
    desc:  'A trending product that is already getting traction on TikTok.',
  },
  {
    icon:  Lightbulb,
    color: 'text-amber-500',
    bg:    'bg-amber-50',
    title: 'Hook & Formula Breakdown',
    desc:  'Why the video works — hook type, emotional trigger, viral formula.',
  },
  {
    icon:  FileText,
    color: 'text-blue-500',
    bg:    'bg-blue-50',
    title: 'AI-Generated Script',
    desc:  'Your own version of the script, ready to read on camera.',
  },
  {
    icon:  ListChecks,
    color: 'text-emerald-500',
    bg:    'bg-emerald-50',
    title: 'Pre-Shoot Checklist',
    desc:  'Environment, props, gear, and mindset — so you can start filming today.',
  },
]

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <p className="text-sm font-semibold text-pink-500 uppercase tracking-widest mb-3">Pricing</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Don&apos;t just find viral products.<br className="hidden sm:block" />
          Get ready to film them.
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Every plan gives you a complete workflow — from discovery to shoot-ready action.
        </p>
        <p className="text-sm text-gray-400 mt-2">No contracts. Cancel anytime.</p>
      </div>

      {/* ── What is a shoot-ready output? ────────────────────────────────────── */}
      <div className="mb-12 rounded-2xl border border-gray-100 bg-gray-50 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">What you get</p>
        <h2 className="text-xl font-bold text-gray-900 mb-1">What is a shoot-ready output?</h2>
        <p className="text-sm text-gray-500 mb-6">
          One output = one complete cycle from viral product to first take. Every plan is measured in outputs, not raw API calls.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {OUTPUT_STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="flex flex-col items-start gap-2">
                <div className={`w-9 h-9 rounded-xl ${step.bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${step.color}`} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                    Step {i + 1}
                  </p>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Plans grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {PLANS.map(plan => {
          const Icon = plan.icon
          return (
            <Card
              key={plan.key}
              className={plan.highlight
                ? 'border-pink-400 shadow-xl ring-2 ring-pink-400 relative'
                : 'relative'}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    MOST POPULAR
                  </span>
                </div>
              )}
              <CardContent className="p-6">
                {/* Plan header */}
                <div className="flex items-center gap-2 mb-0.5">
                  <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                  <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                </div>
                <p className={`text-sm font-semibold mb-1 ${plan.highlight ? 'text-pink-500' : 'text-gray-500'}`}>
                  {plan.tagline}
                </p>
                <p className="text-xs text-gray-400 mb-5 leading-relaxed">{plan.description}</p>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-gray-900">${plan.price}</span>
                    <span className="text-gray-400 text-sm mb-1">/mo</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mb-6">
                  {plan.planSlug ? (
                    <PricingCheckoutButton
                      plan={plan.planSlug}
                      label={plan.cta}
                      highlight={plan.highlight}
                      isLoggedIn={isLoggedIn}
                    />
                  ) : (
                    <Link href={isLoggedIn ? '/dashboard' : '/auth/signup'}>
                      <Button className="w-full bg-gray-900 hover:bg-gray-800">
                        {plan.cta}
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                  {plan.locked.map(feature => (
                    <li key={feature} className="flex items-start gap-2 opacity-40">
                      <X className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Value comparison strip ────────────────────────────────────────────── */}
      <div className="mb-12 rounded-2xl bg-gray-900 text-white p-6 sm:p-8">
        <h3 className="text-base font-semibold mb-1 text-white">How TTLike is different</h3>
        <p className="text-gray-400 text-sm mb-6">Most tools stop at data. TTLike takes you to action.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ['Other product research tools', 'Tell you what products are trending'],
            ['TTLike',                        'Show you why a video works, generate your script, and prep you to shoot'],
            ['Other ad libraries',           'Find winning ads for inspiration'],
            ['TTLike',                        'Convert that inspiration into a shoot-ready output you can film today'],
          ].map(([who, what], i) => (
            <div
              key={i}
              className={`rounded-xl px-4 py-3 ${
                who === 'TTLike'
                  ? 'bg-pink-500/20 border border-pink-500/30 text-pink-200'
                  : 'bg-white/5 border border-white/10 text-gray-400'
              }`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${who === 'TTLike' ? 'text-pink-400' : 'text-gray-600'}`}>
                {who}
              </p>
              <p>{what}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h3>
      </div>
      <div className="max-w-2xl mx-auto space-y-4">
        {[
          {
            q: 'What counts as a shoot-ready output?',
            a: 'One output = one viral product analyzed through the full workflow: Viral Breakdown, AI Script, and Pre-Shoot Checklist. Re-analyzing the same video does not consume additional quota.',
          },
          {
            q: 'Do unused outputs roll over?',
            a: 'Quotas reset on the 1st of each month. Unused outputs do not carry over.',
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
            q: 'Is TTLike useful if I have zero filming experience?',
            a: "Yes. The Pre-Shoot Checklist is designed for beginners — no studio, no fancy gear. You get a list of exactly what to prepare so you can shoot one imperfect take and improve from there.",
          },
          {
            q: 'What is the difference between Creator and Scale?',
            a: 'Creator is for individual sellers and creators. Scale adds team seats (5 users), white-label reporting, and API access for agencies or TikTok Shop teams managing multiple products at once.',
          },
        ].map(({ q, a }) => (
          <div key={q} className="border-b border-gray-100 pb-4">
            <h4 className="font-medium text-gray-900 mb-1">{q}</h4>
            <p className="text-sm text-gray-600">{a}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
