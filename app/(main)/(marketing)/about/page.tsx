import Link from 'next/link'
import { Zap, ShoppingBag, Building2, Video, TrendingUp, Lightbulb, ArrowRight } from 'lucide-react'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: `About – ${SITE_NAME}`,
  description: 'TTLike helps TikTok dropshippers, affiliate creators, and agencies find viral products and generate AI-powered scripts in seconds. Learn about our mission.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: `About ${SITE_NAME}`,
    description: 'AI-powered TikTok viral intelligence for dropshippers, affiliate creators, and agencies.',
    url: `${SITE_URL}/about`,
  },
}

// ── Who we serve ──────────────────────────────────────────────────────────────
const audiences = [
  {
    icon: Video,
    title: 'Affiliate Creators',
    badge: 'No inventory needed',
    badgeColor: 'bg-violet-50 text-violet-600',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    desc: 'You create TikTok videos promoting products through TikTok Shop affiliate links — and earn commission every time someone buys. No warehouse, no shipping, no customer service. TTLike finds you the products most likely to convert right now, and generates the scripts to sell them.',
    bullets: ['Spot commission-ready trending products first', 'Scripts written for affiliate storytelling angles', 'Replicate what\'s already working for top earners'],
  },
  {
    icon: ShoppingBag,
    title: 'Dropshippers & Sellers',
    badge: 'Move product faster',
    badgeColor: 'bg-pink-50 text-pink-600',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-500',
    desc: 'You source products and need content that converts browsers into buyers. TTLike analyses the viral mechanics behind winning product videos so you can replicate them — faster than your competitors can catch up.',
    bullets: ['Rank products by viral score before you stock them', 'Hook lines and full scripts per product in seconds', 'Filming checklist so nothing slows you down on shoot day'],
  },
  {
    icon: Building2,
    title: 'Agencies & Teams',
    badge: 'Scale production',
    badgeColor: 'bg-emerald-50 text-emerald-600',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    desc: 'You manage multiple brands or creators and need a repeatable system for generating winning content at scale. TTLike gives your team a shared intelligence layer — consistent research, consistent scripts, consistent results.',
    bullets: ['Bulk script generation across multiple clients', 'Structured viral breakdowns to brief creators fast', 'Data-backed product selection to pitch to brands'],
  },
]

// ── Values ────────────────────────────────────────────────────────────────────
const values = [
  {
    icon: TrendingUp,
    title: 'Data-Driven',
    desc: 'We analyse thousands of viral TikTok videos every day to surface the products, hooks, and script patterns that are actually working right now — not last month.',
  },
  {
    icon: Lightbulb,
    title: 'AI That Understands Context',
    desc: 'Our script generator doesn\'t produce generic copy — it reads the viral DNA of each product and writes hooks tuned to that specific audience and selling angle.',
  },
]

const stats = [
  { value: '10K+', label: 'Scripts Generated' },
  { value: '500+', label: 'Viral Products Tracked' },
  { value: '3', label: 'Creator Types Served' },
  { value: '4 Steps', label: 'Find to Film' },
]

export default function AboutPage() {
  return (
    <div className="bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-50 text-pink-600 text-xs font-semibold mb-6">
          <Zap className="h-3.5 w-3.5" />
          About TTLike
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
          We make TikTok content{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
            less of a guessing game
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          TTLike is an AI-powered TikTok viral intelligence platform built for affiliate creators,
          dropshippers, and agencies who want to stop guessing what to post — and start making
          videos that actually sell.
        </p>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map(s => (
              <div key={s.label}>
                <dt className="text-3xl font-bold text-white mb-1">{s.value}</dt>
                <dd className="text-sm text-gray-400">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Who we serve ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Built for three kinds of creators</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Whether you hold inventory, earn through affiliate links, or manage content at scale —
            TTLike gives you the research and scripts to move faster.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {audiences.map(a => (
            <div key={a.title} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 flex flex-col">
              {/* Icon + badge */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${a.iconBg} flex items-center justify-center`}>
                  <a.icon className={`h-5 w-5 ${a.iconColor}`} />
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${a.badgeColor}`}>
                  {a.badge}
                </span>
              </div>

              <h3 className="font-bold text-gray-900 text-lg mb-2">{a.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">{a.desc}</p>

              <ul className="space-y-2">
                {a.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-xs text-gray-500">
                    <span className="mt-0.5 text-pink-400 font-bold shrink-0">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Story ────────────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our story</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              TTLike started with a simple frustration: finding the next viral TikTok product
              meant spending hours scrolling through For You pages, manually tracking engagement
              numbers, and reverse-engineering scripts from competitor videos. It was slow,
              inconsistent, and easy to miss the wave entirely.
            </p>
            <p>
              The problem is even sharper for affiliate creators — people who don&apos;t hold
              inventory and depend entirely on picking the right product at the right moment.
              Choose a product that&apos;s already past peak, and you&apos;ve wasted your shoot day.
              Choose one that&apos;s quietly trending, and a single video can earn for weeks.
            </p>
            <p>
              We built TTLike to automate the research layer — so you can spend your time
              creating, not cataloguing. Our platform continuously scores and analyses
              TikTok&apos;s most-engaged product videos, then uses AI to extract the exact script
              patterns that drove those results. The outcome: ranked products with
              ready-to-film scripts, in the time it used to take just to find one worth testing.
            </p>
          </div>

          {/* Inline values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
            {values.map(v => (
              <div key={v.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                    <v.icon className="h-4 w-4 text-pink-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{v.title}</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to find your next winning product?</h2>
        <p className="text-gray-600 mb-8">
          Join affiliate creators, sellers, and agencies using TTLike to stay ahead of the trend curve.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-sm transition-colors shadow-md shadow-pink-500/20"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-sm transition-colors"
          >
            Browse Viral Products
          </Link>
        </div>
      </section>

    </div>
  )
}
