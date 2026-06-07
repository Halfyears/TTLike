import Link from 'next/link'
import { Zap, Target, Users, TrendingUp, Lightbulb, ArrowRight } from 'lucide-react'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: `About – ${SITE_NAME}`,
  description: 'TTLike helps TikTok dropshippers and UGC creators find viral products and generate AI-powered scripts in seconds. Learn about our mission.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: `About ${SITE_NAME}`,
    description: 'AI-powered TikTok viral intelligence for dropshippers and UGC creators.',
    url: `${SITE_URL}/about`,
  },
}

const values = [
  {
    icon: Target,
    title: 'Built for Sellers',
    desc: 'Every feature is designed around one question: does this help you sell more on TikTok? No vanity metrics, no fluff — just tools that move product.',
  },
  {
    icon: TrendingUp,
    title: 'Data-Driven',
    desc: 'We analyse thousands of viral TikTok videos every day to surface the products, hooks, and script patterns that are actually working right now.',
  },
  {
    icon: Lightbulb,
    title: 'AI That Understands Context',
    desc: 'Our AI script generator doesn\'t just produce generic copy — it reads the viral DNA of each product and writes hooks and scripts tuned to that specific audience.',
  },
  {
    icon: Users,
    title: 'Creator-First',
    desc: 'We started as creators and sellers ourselves. We build the tools we wished existed when we were spending hours manually researching what was trending.',
  },
]

const stats = [
  { value: '10K+', label: 'Scripts Generated' },
  { value: '500+', label: 'Viral Products Tracked' },
  { value: '7 Days', label: 'Average Time to First Sale' },
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
          We make TikTok selling{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
            less of a guessing game
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          TTLike is an AI-powered TikTok viral intelligence platform built for dropshippers
          and UGC creators who want to stop guessing and start selling — with data-backed
          product research and scripts that are ready to film in minutes.
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

      {/* ── Story ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Our story</h2>
        <div className="space-y-4 text-gray-600 leading-relaxed">
          <p>
            TTLike started with a simple frustration: finding the next viral TikTok product
            meant spending hours scrolling through For You pages, manually tracking engagement
            numbers, and reverse-engineering scripts from competitor videos. It was slow,
            inconsistent, and easy to miss the wave entirely.
          </p>
          <p>
            We built TTLike to automate the research layer — so you can spend your time
            creating, not cataloguing. Our platform continuously scrapes, scores, and
            analyses TikTok's most-engaged product videos, then uses AI to extract the
            exact script patterns that drove those results.
          </p>
          <p>
            The result: you get a ranked database of viral products with ready-to-use
            AI scripts, tailored to each product's unique selling angle — in the time it
            used to take just to find a product worth testing.
          </p>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">What we believe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map(v => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center">
                    <v.icon className="h-5 w-5 text-pink-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{v.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to find your next viral product?</h2>
        <p className="text-gray-600 mb-8">Join thousands of creators and sellers using TTLike to stay ahead of the curve.</p>
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
