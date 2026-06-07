import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight, Search, Lightbulb, FileText, ListChecks, Video,
  Check, Star, Zap,
} from 'lucide-react'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title:       'From Viral Product to First Take · TTLike',
  description: 'Pick a viral TikTok product. Get your shoot-ready script and pre-shoot checklist. Film one take today — no studio, no experience needed.',
  alternates:  { canonical: `${SITE_URL}/start` },
  openGraph: {
    title:       'From Viral Product to First Take · TTLike',
    description: 'Pick a viral TikTok product. Get your shoot-ready script. Film today.',
    url:         `${SITE_URL}/start`,
    images:      [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630 }],
  },
}

// ── 5-step flow ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: 1,
    icon:   Search,
    color:  'text-pink-500',
    bg:     'bg-pink-50',
    ring:   'ring-pink-200',
    label:  'Find',
    title:  'Find a product getting attention',
    desc:   'Browse 10,000+ products already going viral on TikTok. Filter by niche, viral score, and engagement.',
    cta:    null,
  },
  {
    number: 2,
    icon:   Lightbulb,
    color:  'text-violet-500',
    bg:     'bg-violet-50',
    ring:   'ring-violet-200',
    label:  'Understand',
    title:  'See exactly why the video works',
    desc:   'Hook type, emotional trigger, viral formula, audience pain points — all decoded by AI.',
    cta:    null,
  },
  {
    number: 3,
    icon:   FileText,
    color:  'text-blue-500',
    bg:     'bg-blue-50',
    ring:   'ring-blue-200',
    label:  'Script',
    title:  'Generate your own version',
    desc:   'Paste the TikTok URL. Get a scene-by-scene script with hook, body, and CTA — written for you.',
    cta:    null,
  },
  {
    number: 4,
    icon:   ListChecks,
    color:  'text-emerald-500',
    bg:     'bg-emerald-50',
    ring:   'ring-emerald-200',
    label:  'Prepare',
    title:  'Get your pre-shoot checklist',
    desc:   'Environment, props, gear, and mindset — a checklist built around your specific script.',
    cta:    null,
  },
  {
    number: 5,
    icon:   Video,
    color:  'text-orange-500',
    bg:     'bg-orange-50',
    ring:   'ring-orange-200',
    label:  'Film',
    title:  'Start with one imperfect take',
    desc:   "You don't need a studio. You don't need experience. You just need to press record and go.",
    cta:    null,
  },
]

// ── Persona cards ─────────────────────────────────────────────────────────────

const PERSONAS = [
  {
    emoji: '📦',
    who:   'Dropshippers',
    line:  'Stop saving viral products. Turn them into videos you can actually shoot today.',
  },
  {
    emoji: '🛍️',
    who:   'TikTok Shop Sellers',
    line:  'Find what is trending, understand the hook, and prep your first product video.',
  },
  {
    emoji: '🎥',
    who:   'UGC Creators',
    line:  'Go from idea to shoot-ready in minutes — not hours of research.',
  },
  {
    emoji: '🌱',
    who:   'Complete Beginners',
    line:  'No studio. No fancy gear. Just a product, a script, and a ready-to-shoot checklist.',
  },
]

// ── Testimonials ──────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: 'I used to spend an hour researching products manually. Now I find trending niches in minutes and get a script I can actually film.',
    name:  'K.M.', role: 'Dropshipper · Austin, TX', init: 'K',
  },
  {
    quote: 'The pre-shoot checklist is what changed everything for me. I stopped overthinking and just started filming.',
    name:  'T.R.', role: 'UGC Creator · Los Angeles, CA', init: 'T',
  },
  {
    quote: 'From product discovery to filming in under 10 minutes. That is the TTLike promise and it actually delivers.',
    name:  'J.L.', role: 'TikTok Seller · New York, NY', init: 'J',
  },
]

// ── HowTo structured data (public page — Googlebot can crawl) ────────────────
const howToSchema = {
  '@context':  'https://schema.org',
  '@type':     'HowTo',
  name:        'How to Generate a Shoot-Ready TikTok Script with TTLike',
  description: 'Turn any viral TikTok product URL into a scene-by-scene script with hook, body lines, CTA, and a pre-shoot checklist — in about 20 seconds.',
  totalTime:   'PT2M',
  tool: [
    { '@type': 'HowToTool', name: 'TTLike Viral Studio', url: `${SITE_URL}/studio` },
    { '@type': 'HowToTool', name: 'Any public TikTok video URL' },
  ],
  step: [
    {
      '@type':   'HowToStep',
      position:  1,
      name:      'Find a viral TikTok product',
      text:      "Browse TTLike's product database of 10,000+ videos ranked by viral score, or copy the URL of any public TikTok video featuring a product you want to film.",
      url:       `${SITE_URL}/products`,
    },
    {
      '@type':   'HowToStep',
      position:  2,
      name:      'Paste the TikTok URL into Viral Studio',
      text:      "Open TTLike Viral Studio and paste the TikTok video URL. The AI immediately decodes the hook type, emotional trigger, and viral pattern of the original video.",
      url:       `${SITE_URL}/studio`,
    },
    {
      '@type':   'HowToStep',
      position:  3,
      name:      'Confirm your product details',
      text:      'Enter your product name, category, and up to 5 customer pain points. TTLike uses these to personalise the script for your specific audience.',
      url:       `${SITE_URL}/studio`,
    },
    {
      '@type':   'HowToStep',
      position:  4,
      name:      'Get your shoot-ready script and checklist',
      text:      'Receive a scene-by-scene script (hook, body, CTA), a hook-pattern breakdown, and a personalised pre-shoot checklist. Copy the script and start filming.',
      url:       `${SITE_URL}/studio`,
    },
    {
      '@type':   'HowToStep',
      position:  5,
      name:      'Film one imperfect take',
      text:      "Tick off your pre-shoot checklist, press record, and shoot one take. You don't need a studio or experience — just a product and the script TTLike gave you.",
      url:       `${SITE_URL}/start`,
    },
  ],
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StartPage() {
  return (
    <div className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-pink-500/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">

          {/* Campaign badge */}
          <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs sm:text-sm px-4 py-1.5 rounded-full mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
            5 steps · ~10 minutes · Free to start
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-5">
            From Viral Product<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
              to First Take
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-3">
            Pick a viral TikTok product. Get your script. Check the list. Film one take today.
          </p>
          <p className="text-sm text-gray-500 mb-10">
            No studio. No experience. No overthinking.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link href="/auth/signup">
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold rounded-2xl text-base transition-all shadow-xl shadow-pink-500/20 hover:shadow-pink-500/30">
                <Zap className="w-5 h-5" />
                Start Free — No Credit Card
              </button>
            </Link>
            <Link href="/products">
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-2xl text-base transition-all">
                <Search className="w-4 h-4" />
                Browse Products First
              </button>
            </Link>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            {['10,000+ viral products tracked', 'AI script in ~20 seconds', 'Pre-shoot checklist included', 'Free plan available'].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5 Steps ──────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-pink-500 mb-3">The Workflow</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              5 steps from discovery to filming
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Most people collect product ideas forever and never film. TTLike closes that gap.
            </p>
          </div>

          <div className="space-y-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const isLast = i === STEPS.length - 1
              return (
                <div key={step.number} className="relative">
                  {/* Connector line */}
                  {!isLast && (
                    <div className="absolute left-[27px] top-[56px] w-0.5 h-8 bg-gray-100 z-0 hidden sm:block" />
                  )}
                  <div className={`relative flex gap-5 p-5 sm:p-6 rounded-2xl border transition-colors ${
                    isLast
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                      : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                  }`}>
                    {/* Step badge + icon */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center ${
                        isLast ? 'bg-emerald-500' : 'bg-gray-800'
                      }`}>
                        {step.number}
                      </div>
                      <div className={`w-10 h-10 rounded-xl ${step.bg} ring-1 ${step.ring} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                    </div>
                    {/* Content */}
                    <div className="min-w-0 pt-0.5">
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${step.color}`}>
                        {step.label}
                      </p>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{step.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <Link href="/auth/signup">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 text-white font-bold rounded-2xl text-base transition-opacity shadow-lg shadow-pink-500/15">
                Start the workflow free <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <p className="text-xs text-gray-400 mt-3">No credit card · Takes 30 seconds to sign up</p>
          </div>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Built for TikTok sellers at every stage</h2>
            <p className="text-gray-500 text-sm">Whether you have zero videos or 500, TTLike removes the bottleneck between idea and action.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PERSONAS.map(p => (
              <div key={p.who} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-pink-200 hover:shadow-sm transition-all">
                <div className="text-2xl mb-2">{p.emoji}</div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm">{p.who}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ─────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">From first visit to first take</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold text-sm shrink-0">
                    {t.init}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                    <p className="text-[11px] text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <p className="text-sm font-semibold text-pink-400 uppercase tracking-widest mb-3">You already have everything you need</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
            One product.<br />One script.<br />One imperfect take.
          </h2>
          <p className="text-gray-400 mb-3 max-w-md mx-auto">
            Stop waiting for the perfect setup. TTLike gets you to the moment you press record — in under 10 minutes.
          </p>
          <p className="text-gray-600 text-sm mb-10">Free plan · No credit card · Cancel anytime</p>

          <Link href="/auth/signup">
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold rounded-2xl text-lg transition-all shadow-xl shadow-pink-500/20">
              <Zap className="w-5 h-5" />
              Start Free Now
            </button>
          </Link>

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
            {[
              '10,000+ products tracked',
              'Script in ~20 seconds',
              'Pre-shoot checklist',
            ].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
