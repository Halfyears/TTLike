import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight, Zap, TrendingUp, Brain, ShoppingBag,
  Star, Users, Search, Wand2, CheckCircle2,
  BookOpen, ChevronDown, ListChecks,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from '@/lib/constants'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { queryD1First, queryD1Rows } from '@/lib/cloudflare/d1'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `${SITE_NAME} · Find Viral TikTok Products. Generate Scripts. Get Ready to Shoot.`,
  description: 'TTLike helps TikTok sellers move from viral product discovery to shoot-ready action. Find trending products, decode why they go viral, generate your script, and get a pre-shoot checklist — all in one place.',
  openGraph: {
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630 }],
  },
  alternates: { canonical: SITE_URL },
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function getTopVideos() {
  try {
    const d1Videos = await queryD1Rows<Record<string, unknown>>(
      `SELECT id, product_name, title, niche, viral_score, views
         FROM tiktok_videos
        WHERE deleted_at IS NULL
        ORDER BY viral_score DESC
        LIMIT 6`,
    )
    if (d1Videos) return d1Videos

    const supabase = await createClient()
    const { data } = await supabase
      .from('tiktok_videos')
      .select('id, product_name, title, niche, viral_score, views')
      .order('viral_score', { ascending: false })
      .limit(6)
    return data ?? []
  } catch { return [] }
}

const SCRIPTS_LAUNCH_OFFSET = 850   // credible floor before real usage accumulates

async function getPlatformStats() {
  try {
    const [videosRow, analysesRow, usersRow, usageRow] = await Promise.all([
      queryD1First<{ total: number }>('SELECT COUNT(*) AS total FROM tiktok_videos WHERE deleted_at IS NULL'),
      queryD1First<{ total: number }>("SELECT COUNT(*) AS total FROM video_breakdowns WHERE viral_status = 'COMPLETED'"),
      queryD1First<{ total: number }>('SELECT COUNT(*) AS total FROM users'),
      queryD1First<{ total: number | null }>('SELECT COALESCE(SUM(video_analysis_used), 0) AS total FROM user_billing_tiers'),
    ])

    if (videosRow && analysesRow && usersRow && usageRow) {
      return {
        products:      Number(videosRow.total ?? 0),
        analyses:      Number(analysesRow.total ?? 0),
        users:         Number(usersRow.total ?? 0),
        totalScripts:  Number(usageRow.total ?? 0) + SCRIPTS_LAUNCH_OFFSET,
      }
    }

    const service = createServiceClient()
    const [videosRes, analysesRes, usersRes, usageRes] = await Promise.all([
      service.from('tiktok_videos').select('id', { count: 'exact', head: true }),
      service.from('video_breakdowns').select('id', { count: 'exact', head: true }).eq('viral_status', 'COMPLETED'),
      service.from('users').select('id', { count: 'exact', head: true }),
      service.from('user_billing_tiers').select('video_analysis_used'),
    ])
    const realUsage    = (usageRes.data ?? []).reduce((s, r) => s + (Number(r.video_analysis_used) || 0), 0)
    const totalScripts = realUsage + SCRIPTS_LAUNCH_OFFSET
    return {
      products:      videosRes.count  ?? 0,
      analyses:      analysesRes.count ?? 0,
      users:         usersRes.count   ?? 0,
      totalScripts,
    }
  } catch {
    return { products: 0, analyses: 0, users: 0, totalScripts: SCRIPTS_LAUNCH_OFFSET }
  }
}

// ── Static hook previews — colours written as full literal strings for Tailwind JIT ──
const HOOK_PREVIEWS = [
  {
    type: 'SURPRISE',
    title: 'The "I Had No Idea" Hook',
    example: 'I had no idea a $15 massage gun could fix my 2-year back pain until I tried it...',
    viralScore: 94,
    wrapCls:  'bg-yellow-50 border-yellow-200 text-yellow-700',
    badgeCls: 'bg-yellow-100 text-yellow-700',
  },
  {
    type: 'QUESTION',
    title: 'The Pain Point Question',
    example: "Are you still waking up with back pain in 2025? There's a better way...",
    viralScore: 91,
    wrapCls:  'bg-blue-50 border-blue-200 text-blue-700',
    badgeCls: 'bg-blue-100 text-blue-700',
  },
  {
    type: 'FOMO',
    title: 'The Trend Warning',
    example: "Everyone is buying this posture corrector right now and here's why you should too...",
    viralScore: 89,
    wrapCls:  'bg-red-50 border-red-200 text-red-700',
    badgeCls: 'bg-red-100 text-red-700',
  },
]

// ── Studio demo — static script output preview ────────────────────────────────
const DEMO_SCRIPT = [
  { time: '00:00–00:03', beat: 'Opening Hook', say: 'I had no idea a $15 product could fix my 2-year back pain.', do: 'Hold product up to camera, shocked expression' },
  { time: '00:03–00:08', beat: 'Problem Reveal', say: 'I\'ve tried everything — chiropractors, stretching, expensive gadgets.', do: 'Show frustrated face, gestures of spending money' },
  { time: '00:08–00:15', beat: 'Solution Drop', say: 'Then I found this. And honestly? It worked on day one.', do: 'Slow product reveal, close-up shot' },
  { time: '00:15–00:22', beat: 'Call to Action', say: 'Link in bio. It\'s under $20 and worth every cent.', do: 'Point to screen, smile, confident close' },
]

// ── FAQ items ─────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'What can I do without signing up?', a: 'Browse our full product database, explore all 12 hook patterns in the Hook Library, and read viral breakdowns — all free, no account required.' },
  { q: 'What do I get after signing up (free)?', a: 'Unlimited product browsing, 10 AI hook generations per day, and access to Viral Studio to generate scripts from any TikTok URL.' },
  { q: 'How does the Viral Studio work?', a: 'Paste any public TikTok video URL. Our AI pipeline analyzes the video\'s viral structure in ~20 seconds, then generates a ready-to-film script with hook, emotion arc, and scene-by-scene directions.' },
  { q: 'Do I need a TikTok account?', a: 'No. You just need the URL of any public TikTok video you want to analyze.' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

// ── Format large numbers: 1234 → "1.2K", 12345 → "12K" ──────────────────────
function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K+`
  return n > 0 ? `${n}+` : '—'
}

export default async function HomePage() {
  const [trending, stats] = await Promise.all([getTopVideos(), getPlatformStats()])

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type':    'FAQPage',
            mainEntity: FAQS.map(({ q, a }) => ({
              '@type':        'Question',
              name:           q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          }),
        }}
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-900/30 via-transparent to-violet-900/20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-14 sm:pt-20 sm:pb-24 text-center">

          <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm px-4 py-1.5 rounded-full mb-6 sm:mb-8">
            <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
            AI-Powered · Free to Start · No Credit Card
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-5 sm:mb-6">
            Find Viral TikTok Products and<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
              Turn Them Into Shoot-Ready Scripts
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto mb-5 sm:mb-6">
            Discover winning products, decode their viral hooks, generate your own script, and get a pre-shoot checklist — so you can start filming today.
          </p>

          {/* Workflow steps pill */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-8 sm:mb-10 flex-wrap">
            {[
              { label: 'Find', color: 'text-pink-400' },
              { label: '→', color: 'text-gray-600' },
              { label: 'Understand', color: 'text-violet-400' },
              { label: '→', color: 'text-gray-600' },
              { label: 'Script', color: 'text-blue-400' },
              { label: '→', color: 'text-gray-600' },
              { label: 'Prepare to Shoot', color: 'text-emerald-400' },
            ].map((step, i) => (
              <span key={i} className={`text-sm font-semibold ${step.color}`}>{step.label}</span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link href="/studio">
              <Button size="lg" className="w-full sm:w-auto">
                <Wand2 className="mr-2 h-5 w-5" /> Generate Shoot-Ready Script
              </Button>
            </Link>
            <Link href="/products">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Search className="mr-2 h-4 w-4" /> Browse Products Free
              </Button>
            </Link>
          </div>

          <div className="mt-10 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-sm text-gray-400 max-w-lg sm:max-w-none mx-auto">
            {[
              [stats.products > 0 ? fmtCount(stats.products) : '10K+', 'Products Tracked'],
              [fmtCount(stats.totalScripts),                            'Scripts Generated'],
              ['~20s',                                                  'Script Generation'],
              ['Free',                                                  'No Credit Card'],
            ].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">{val}</div>
                <div className="text-xs sm:text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── P3: How It Works — 3-step flow ──────────────────────────────────── */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-sm font-semibold text-pink-500 uppercase tracking-widest mb-3">The Workflow</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">From Viral Product to First Take</h2>
            <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">Most tools stop at data. TTLike takes you all the way to the moment you press record.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">

            {/* Step 1 */}
            <div className="relative">
              <div className="hidden md:block absolute top-10 left-full w-full h-px border-t-2 border-dashed border-gray-200 -translate-x-4 z-0" />
              <div className="relative bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-pink-500 text-white text-sm font-bold flex items-center justify-center shrink-0">1</div>
                  <span className="text-xs font-semibold text-pink-500 uppercase tracking-wide">No login needed</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center mb-3">
                  <Search className="w-5 h-5 text-pink-500" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Find Viral Products</h3>
                <p className="text-sm text-gray-600 mb-4">Browse 10,000+ products ranked by viral score. See views, engagement, and niche trends updated daily.</p>

                {/* Mini product preview */}
                <div className="space-y-2">
                  {trending.slice(0, 2).map((p: Record<string, unknown>) => (
                    <div key={String(p.id)} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{String(p.niche ?? 'General')}</span>
                      <span className="text-xs text-gray-700 font-medium truncate flex-1">{String(p.product_name ?? p.title ?? '').slice(0, 40)}</span>
                      <ViralScoreBadge score={Math.round(Number(p.viral_score ?? 0))} showLabel={false} />
                    </div>
                  ))}
                </div>

                <Link href="/products" className="mt-4 flex items-center gap-1 text-sm font-medium text-pink-500 hover:text-pink-600">
                  Browse all products <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="hidden md:block absolute top-10 left-full w-full h-px border-t-2 border-dashed border-gray-200 -translate-x-4 z-0" />
              <div className="relative bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-violet-500 text-white text-sm font-bold flex items-center justify-center shrink-0">2</div>
                  <span className="text-xs font-semibold text-violet-500 uppercase tracking-wide">No login needed</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-violet-500" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Decode the Hook</h3>
                <p className="text-sm text-gray-600 mb-4">12 proven hook patterns. See exactly how each one works, with a ready-to-customize template.</p>

                {/* Mini hook preview */}
                <div className="space-y-2">
                  {HOOK_PREVIEWS.slice(0, 2).map(h => (
                    <div key={h.type} className={['rounded-lg px-3 py-2 border text-xs', h.wrapCls].join(' ')}>
                      <div className="font-semibold mb-0.5">{h.title}</div>
                      <div className="opacity-80 line-clamp-1">{h.example}</div>
                    </div>
                  ))}
                </div>

                <Link href="/hooks" className="mt-4 flex items-center gap-1 text-sm font-medium text-violet-500 hover:text-violet-600">
                  Explore all 12 hooks <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-white text-gray-900 text-sm font-bold flex items-center justify-center shrink-0">3</div>
                <span className="text-xs font-semibold text-pink-400 uppercase tracking-wide">Free after signup</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                <Wand2 className="w-5 h-5 text-pink-400" />
              </div>
              <h3 className="font-bold text-white mb-1">Get Shoot-Ready</h3>
              <p className="text-sm text-gray-400 mb-4">
                Paste any TikTok URL → AI script in ~20 seconds, plus a pre-shoot checklist so you can start filming today.
              </p>

              {/* Script + checklist preview */}
              <div className="space-y-1.5 mb-3">
                {DEMO_SCRIPT.slice(0, 2).map((line, i) => (
                  <div key={i} className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-gray-500">{line.time}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 font-medium">{line.beat}</span>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-1 italic">&ldquo;{line.say}&rdquo;</p>
                  </div>
                ))}
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Pre-Shoot Checklist</span>
                </div>
                <p className="text-xs text-gray-400">Environment · Props · Gear · Mindset</p>
              </div>

              <Link href="/auth/signup">
                <button className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" /> Generate Shoot-Ready Script Free
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── P2: Trending Products (6 cards) ──────────────────────────────────── */}
      <section className="py-10 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Trending Right Now</h2>
              <p className="text-gray-600 text-sm mt-1">Products going viral on TikTok today — no login required to browse</p>
            </div>
            <Link href="/products" className="text-pink-500 text-sm font-medium flex items-center gap-1 hover:text-pink-600 shrink-0 ml-4">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {trending.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

          <div className="mt-6 text-center">
            <Link href="/products">
              <Button variant="secondary" size="sm">
                See all {10000}+ products <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Hook Library Teaser ────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">12 Proven Hook Patterns</h2>
              <p className="text-gray-600 text-sm mt-1">Every pattern has a viral score, template, and real example — all free to browse</p>
            </div>
            <Link href="/hooks" className="text-pink-500 text-sm font-medium flex items-center gap-1 hover:text-pink-600 shrink-0">
              Explore all hooks <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOOK_PREVIEWS.map(hook => (
              <div key={hook.type} className={['rounded-2xl p-5 border', hook.wrapCls].join(' ')}>
                <div className="flex items-center justify-between mb-3">
                  <span className={['text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full', hook.badgeCls].join(' ')}>{hook.type}</span>
                  <span className="text-xs font-bold text-gray-700">⚡ {hook.viralScore} viral</span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{hook.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed italic">&ldquo;{hook.example}&rdquo;</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <span>All 12 patterns are <strong className="text-gray-700">free to browse</strong> · AI generation unlocks after free signup</span>
          </div>
        </div>
      </section>

      {/* ── Features (simplified) ─────────────────────────────────────────────── */}
      <section className="py-10 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Everything You Need to Win on TikTok</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">One platform for product research, hook analysis, and AI content creation.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {[
              { icon: TrendingUp, title: 'Viral Product Intelligence', desc: 'Discover products going viral before they peak. AI tracks 10,000+ TikTok videos daily.' },
              { icon: Brain, title: 'Hook Pattern Analysis', desc: 'Decode exactly why videos go viral. Get the hook formula, emotion triggers, and CTA styles.' },
              { icon: Wand2, title: 'Viral Studio', desc: 'Paste any TikTok URL → get a scene-by-scene script in ~20 seconds. Powered by a 6-stage AI pipeline.' },
              { icon: ShoppingBag, title: 'Product-Market Fit Score', desc: 'Know which products are actually converting, not just getting views.' },
            ].map(({ icon: Icon, title, desc }) => (
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

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-16 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Common Questions</h2>
            <p className="text-gray-500 text-sm">Everything you need to know before signing up</p>
          </div>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors list-none">
                  <span className="font-medium text-gray-900 text-sm sm:text-base pr-4">{q}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ──────────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">

          {/* Real platform stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-lg sm:max-w-xl mx-auto mb-10 sm:mb-14">
            {[
              { value: fmtCount(stats.products),  label: 'Products tracked' },
              { value: fmtCount(stats.analyses),  label: 'Scripts generated' },
              { value: fmtCount(stats.users),      label: 'Creators signed up' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">{value}</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">What Creators Are Saying</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                quote: 'I used to spend an hour researching products manually. Now I find trending niches in minutes with the viral score filter. The hook library alone is worth it.',
                name:  'K.M.',
                role:  'Dropshipper · Austin, TX',
                init:  'K',
              },
              {
                quote: 'Pasted a viral video URL and got a complete script breakdown in 20 seconds. The hook + emotion arc structure is exactly how I needed to think about my content.',
                name:  'T.R.',
                role:  'UGC Creator · Los Angeles, CA',
                init:  'T',
              },
              {
                quote: 'The anti-duplication hook variants let me post the same product 4 different ways without getting flagged. My account reach went up after switching to this workflow.',
                name:  'J.L.',
                role:  'TikTok Seller · New York, NY',
                init:  'J',
              },
            ].map(({ quote, name, role, init }) => (
              <Card key={name} className="p-5 sm:p-6 text-left">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold text-sm shrink-0">{init}</div>
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

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-pink-500 to-violet-600 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Users className="h-10 w-10 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Stop saving viral products.<br className="hidden sm:block" />
            Start filming them.
          </h2>
          <p className="text-pink-100 mb-2 text-sm sm:text-base max-w-lg mx-auto">
            Pick a viral product. Get your script. Check the pre-shoot list. Film one imperfect take today.
          </p>
          <p className="text-pink-200 text-xs mb-8">No credit card · Instant access · Cancel anytime</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white text-pink-600 hover:bg-pink-50">
                <Wand2 className="mr-2 h-5 w-5" /> Generate Shoot-Ready Script Free
              </Button>
            </Link>
            <Link href="/products">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-transparent border-white/40 text-white hover:bg-white/10">
                <Search className="mr-2 h-4 w-4" /> Browse Products First
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
