import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Zap, TrendingUp, Brain, ShoppingBag, Star, Users, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
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
      .select('id, product_name, title, niche, viral_score, views')
      .order('viral_score', { ascending: false })
      .limit(4)
    return data ?? []
  } catch { return [] }
}

const FEATURES = [
  { icon: TrendingUp, title: 'Viral Product Intelligence', desc: 'Discover products going viral before they peak. AI tracks 10,000+ TikTok videos daily.' },
  { icon: Brain, title: 'Hook Pattern Analysis', desc: 'Decode exactly why videos go viral. Get the hook formula, emotion triggers, and CTA styles.' },
  { icon: Zap, title: 'AI Script Generator', desc: 'Generate 5 script variations in seconds using Claude AI. Pick your hook type and go.' },
  { icon: ShoppingBag, title: 'Product-Market Fit Score', desc: 'Know which products are actually converting, not just getting views.' },
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-900/30 via-transparent to-violet-900/20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-14 sm:pt-20 sm:pb-24 text-center">

          <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm px-4 py-1.5 rounded-full mb-6 sm:mb-8">
            <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
            AI-Powered · Free to Start · No Credit Card
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-5 sm:mb-6">
            Find Viral TikTok Products<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
              Before They Blow Up
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto mb-8 sm:mb-10">
            AI-powered intelligence for TikTok sellers. Discover trending products, decode viral hooks, and generate UGC scripts in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start for Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/products">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Play className="mr-2 h-4 w-4" /> Browse Products
              </Button>
            </Link>
          </div>

          <div className="mt-10 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-sm text-gray-400 max-w-lg sm:max-w-none mx-auto">
            {[['10K+', 'Products Tracked'], ['94%', 'Viral Accuracy'], ['5 sec', 'Script Generation'], ['3 Plans', 'Free · Creator · Scale']].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">{val}</div>
                <div className="text-xs sm:text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-10 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Trending Right Now</h2>
              <p className="text-gray-600 text-sm mt-1">Products going viral on TikTok today</p>
            </div>
            <Link href="/products" className="text-pink-500 text-sm font-medium flex items-center gap-1 hover:text-pink-600 shrink-0 ml-4">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {trending.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {trending.map((product: Record<string, unknown>) => (
                <Link key={String(product.id)} href={`/products/${product.id}`}>
                  <Card hover className="h-full">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full truncate mr-1">
                          {String(product.niche ?? 'General')}
                        </span>
                        <ViralScoreBadge score={Math.round(Number(product.viral_score ?? 0))} showLabel={false} />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-2 line-clamp-2 leading-snug">
                        {String(product.product_name ?? product.title ?? '')}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <TrendingUp className="h-3 w-3 text-pink-400 shrink-0" />
                        {(Number(product.views ?? 0) / 1_000_000).toFixed(1)}M views
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Everything You Need to Win on TikTok</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">One platform for product research, hook analysis, and AI content creation.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-pink-50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">{title}</h3>
                    <p className="text-sm text-gray-600">{desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Loved by TikTok Sellers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { quote: 'Found a $50K/month product in my first week. The viral score is incredibly accurate.', name: 'Sarah K.', role: 'Dropshipper' },
              { quote: 'The AI script generator saves me 3 hours per day. My UGC conversion rate is up 40%.', name: 'Marcus T.', role: 'UGC Creator' },
              { quote: 'Finally a tool that actually understands TikTok. The hook analysis is next level.', name: 'Jenny L.', role: 'TikTok Seller' },
            ].map(({ quote, name, role }) => (
              <Card key={name} className="p-5 sm:p-6 text-left">
                <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold text-sm shrink-0">{name[0]}</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{name}</div>
                    <div className="text-xs text-gray-500">{role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-pink-500 to-violet-600 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Users className="h-10 w-10 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Join 1,000+ TikTok Sellers Today</h2>
          <p className="text-pink-100 mb-8 text-sm sm:text-base">Start free. Upgrade to Creator or Scale anytime.</p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white text-pink-600 hover:bg-pink-50">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}
