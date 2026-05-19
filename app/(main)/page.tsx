import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Zap, TrendingUp, Brain, ShoppingBag, Star, Users, Play, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `${SITE_NAME} · AI TikTok Viral Intelligence for Dropshippers`,
  description: SITE_DESCRIPTION,
  openGraph: {
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630 }],
  },
  alternates: { canonical: SITE_URL },
}

async function getTopVideos() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tiktok_videos')
      .select('id, product_name, title, niche, viral_score, views, cover_url')
      .order('viral_score', { ascending: false })
      .limit(6)
    return data ?? []
  } catch { return [] }
}

const FEATURES = [
  { icon: TrendingUp, title: 'Viral Product Intelligence', desc: 'Discover products going viral before they peak.' },
  { icon: Brain, title: 'Hook Pattern Analysis', desc: 'Decode why videos go viral with AI breakdown.' },
  { icon: Zap, title: 'AI Script Generator', desc: 'Generate 5 UGC scripts in seconds with Claude AI.' },
  { icon: ShoppingBag, title: 'Product-Market Fit Score', desc: 'Know which products are actually converting.' },
]

const TESTIMONIALS = [
  { quote: 'Found a $50K/month product in my first week. The viral score is incredibly accurate.', name: 'Sarah K.', role: 'Dropshipper' },
  { quote: 'The AI script generator saves me 3 hours per day. My UGC conversion rate is up 40%.', name: 'Marcus T.', role: 'UGC Creator' },
  { quote: 'Finally a tool that actually understands TikTok. The hook analysis is next level.', name: 'Jenny L.', role: 'TikTok Seller' },
]

export default async function HomePage() {
  const trending = await getTopVideos()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: SITE_NAME,
            description: SITE_DESCRIPTION,
            url: SITE_URL,
            applicationCategory: 'BusinessApplication',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          }),
        }}
      />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-900/30 via-transparent to-violet-900/20" />

        <div className="relative mx-auto max-w-4xl px-5 pt-12 pb-10 sm:pt-20 sm:pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-pink-500/15 border border-pink-500/25 text-pink-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
            Beta · 100% Free · No Credit Card
          </div>

          {/* Headline */}
          <h1 className="text-[2rem] leading-tight sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Find Viral TikTok Products{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
              Before They Blow Up
            </span>
          </h1>

          {/* Sub */}
          <p className="text-gray-300 text-[0.95rem] sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            AI-powered intelligence for TikTok sellers — viral products, hook analysis, and UGC scripts in one place.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/auth/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full text-base py-3.5">
                Start for Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/products" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full text-base py-3.5 bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Play className="mr-2 h-4 w-4" /> Browse Products
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {[['10K+', 'Products Tracked'], ['94%', 'Viral Accuracy'], ['5 sec', 'Script Generation'], ['Free', 'During Beta']].map(([val, label]) => (
              <div key={label} className="bg-white/5 rounded-xl py-3 px-2">
                <div className="text-xl sm:text-2xl font-bold text-white">{val}</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRENDING PRODUCTS ── */}
      <section className="py-10 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Trending Right Now</h2>
              <p className="text-gray-500 text-sm mt-0.5">Products going viral on TikTok today</p>
            </div>
            <Link href="/products" className="flex items-center gap-1 text-pink-500 text-sm font-semibold hover:text-pink-600 shrink-0 ml-4">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {trending.length === 0 ? (
            /* Empty state — visible placeholder cards */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-gray-100" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Horizontal scroll on mobile, grid on desktop */
            <div className="-mx-5 sm:mx-0">
              <div className="flex gap-3 px-5 sm:px-0 overflow-x-auto pb-3 sm:pb-0 snap-x snap-mandatory sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible">
                {trending.map((product: Record<string, unknown>) => (
                  <Link
                    key={String(product.id)}
                    href={`/products/${product.id}`}
                    className="flex-shrink-0 w-40 sm:w-auto snap-start"
                  >
                    <div className="bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow overflow-hidden h-full">
                      {/* Thumbnail */}
                      <div className="aspect-[3/4] bg-gradient-to-br from-pink-50 to-violet-50 overflow-hidden relative">
                        {product.cover_url ? (
                          <img
                            src={String(product.cover_url)}
                            alt={String(product.product_name ?? product.title ?? '')}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-8 w-8 text-pink-200" />
                          </div>
                        )}
                        <div className="absolute top-1.5 right-1.5">
                          <ViralScoreBadge score={Math.round(Number(product.viral_score ?? 0))} showLabel={false} />
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <span className="text-[10px] font-semibold text-pink-500 uppercase tracking-wide">
                          {String(product.niche ?? 'General')}
                        </span>
                        <p className="text-xs font-semibold text-gray-900 mt-0.5 line-clamp-2 leading-tight">
                          {String(product.product_name ?? product.title ?? '')}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {(Number(product.views ?? 0) / 1_000_000).toFixed(1)}M views
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {/* Scroll hint on mobile */}
              <p className="sm:hidden text-center text-xs text-gray-400 mt-2">← Swipe to see more →</p>
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-10 sm:py-16 bg-white">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">Everything You Need to Win</h2>
            <p className="text-gray-500 text-sm sm:text-base">One platform for product research, hooks, and AI scripts.</p>
          </div>
          {/* 2×2 grid on all screens — clean and compact */}
          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-3 bg-gray-50 rounded-2xl p-4 sm:p-6">
                <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                  <Icon className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">{title}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="py-10 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-0.5 mb-3">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-6">Loved by TikTok Sellers</h2>

          {/* Horizontal scroll on mobile */}
          <div className="-mx-5 sm:mx-0">
            <div className="flex gap-3 px-5 sm:px-0 overflow-x-auto pb-3 sm:pb-0 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible">
              {TESTIMONIALS.map(({ quote, name, role }) => (
                <div key={name} className="flex-shrink-0 w-72 sm:w-auto snap-start bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm shrink-0">{name[0]}</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{name}</div>
                      <div className="text-xs text-gray-400">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-pink-500 to-violet-600 text-white">
        <div className="mx-auto max-w-lg px-5 text-center">
          <Users className="h-9 w-9 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Join 1,000+ TikTok Sellers</h2>
          <p className="text-pink-100 text-sm mb-8">Free during beta. No credit card. Cancel anytime.</p>
          <Link href="/auth/signup" className="block">
            <Button size="lg" variant="secondary" className="w-full bg-white text-pink-600 hover:bg-pink-50 text-base py-3.5">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}
