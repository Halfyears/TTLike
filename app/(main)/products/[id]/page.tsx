import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Eye, Heart, Share2, MessageCircle,
  ExternalLink, Zap, TrendingUp, Tag, AlertCircle, Sparkles, FileText,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatNumber } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getVideo(id: string) {
  const url = new URL(`/rest/v1/tiktok_videos`, process.env.NEXT_PUBLIC_SUPABASE_URL)
  url.searchParams.set('select', '*')
  url.searchParams.set('id', `eq.${id}`)
  url.searchParams.set('limit', '1')

  const res = await fetch(url.toString(), {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const rows = await res.json()
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

async function getSimilar(niche: string, excludeId: string) {
  const url = new URL(`/rest/v1/tiktok_videos`, process.env.NEXT_PUBLIC_SUPABASE_URL)
  url.searchParams.set('select', 'id,product_name,title,viral_score')
  url.searchParams.set('niche', `eq.${niche}`)
  url.searchParams.set('id', `neq.${excludeId}`)
  url.searchParams.set('order', 'viral_score.desc')
  url.searchParams.set('limit', '4')

  const res = await fetch(url.toString(), {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const rows = await res.json()
  return Array.isArray(rows) ? rows : []
}

// ─── AI Insight derivation (server-side, no extra API call) ──────────────────

const NICHE_PAIN: Record<string, string> = {
  'Health & Beauty': 'Appearance & physical discomfort',
  'Fitness': 'Low energy / poor performance',
  'Home & Garden': 'Messy or inefficient living space',
  'Kitchen': 'Cooking is slow or messy',
  'Tech Gadgets': 'Device frustration & wasted time',
  'Fashion': 'Style confidence / fit issues',
  'Pet Care': 'Pet health & owner guilt',
  'Baby & Kids': 'Parenting stress / child safety',
  'Outdoors': 'Gear gaps on adventures',
  'Office': 'Discomfort & low productivity at desk',
}

const NICHE_USP: Record<string, string> = {
  'Health & Beauty': 'Visible results fast • No prescription needed',
  'Fitness': 'Works at home • No gym required',
  'Home & Garden': 'Instant before/after • Zero effort cleanup',
  'Kitchen': 'Saves time • Easy cleanup',
  'Tech Gadgets': 'One-tap solution • Plug & play',
  'Fashion': 'Instant style upgrade • Affordable luxury',
  'Pet Care': 'Vet-approved • Pets love it',
  'Baby & Kids': 'Safe materials • Mom-tested',
  'Outdoors': 'Lightweight • Built to last',
  'Office': 'Ergonomic • Ships fast',
}

function deriveInsights(v: Record<string, unknown>) {
  const text = `${v.title ?? ''} ${v.product_name ?? ''}`.toLowerCase()
  const niche = String(v.niche ?? 'General')

  // Detect hook type from title patterns
  let hookType = 'Emotional'
  if (/\?|why|are you|do you/.test(text)) hookType = 'Question'
  else if (/can't believe|had no idea|shocked|never knew/.test(text)) hookType = 'Surprise'
  else if (/stop |pov:|vs |instead of|ditch/.test(text)) hookType = 'Contrarian'
  else if (/i spent|i tried|i bought|after \d|years of/.test(text)) hookType = 'Story'
  else if (/everyone|selling out|going viral|trending/.test(text)) hookType = 'FOMO'
  else if (/did you know|tip:|hack:|secret|fact/.test(text)) hookType = 'Educational'

  const painPoint = NICHE_PAIN[niche] ?? 'Everyday inconvenience'
  const usp = NICHE_USP[niche] ?? 'Affordable • High quality • Fast shipping'

  // Use raw title as the "caption" proxy
  const caption = String(v.title ?? v.product_name ?? '').trim()

  return { hookType, painPoint, usp, caption }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const v = await getVideo(id)
  if (!v) notFound()

  const productName = String(v.product_name ?? v.title ?? 'Untitled')
  const niche = String(v.niche ?? 'General')
  const similar = await getSimilar(niche, id)
  const insights = deriveInsights(v)

  const engagementRate = Number(v.views ?? 0) > 0
    ? (((Number(v.likes ?? 0) + Number(v.shares ?? 0) * 3 + Number(v.comments ?? 0) * 2) / Number(v.views)) * 100).toFixed(2)
    : '0'

  const cloneHref = `/dashboard/ai-scripts?from_video=${encodeURIComponent(String(v.id))}&suggested_title=${encodeURIComponent(productName)}&niche=${encodeURIComponent(niche)}&keywords=${encodeURIComponent(String(v.title ?? ''))}`

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* ── Title row ── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge>{niche}</Badge>
            <ViralScoreBadge score={Math.round(Number(v.viral_score ?? 0))} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{productName}</h1>
          {v.author && <p className="text-gray-500 text-sm mt-1">@{String(v.author)}</p>}
        </div>
        {/* Primary CTA — desktop */}
        <Link href={cloneHref} className="hidden sm:block shrink-0">
          <Button size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" /> Clone &amp; Rewrite
          </Button>
        </Link>
      </div>

      {/* ── Dual-panel workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LEFT: Video + Metrics ── */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-xl">
              {/* Cover image */}
              {v.cover_url ? (
                <div className="relative aspect-video bg-gray-100">
                  <img
                    src={String(v.cover_url)}
                    alt={productName}
                    className="w-full h-full object-cover"
                  />
                  {v.video_url && (
                    <a
                      href={String(v.video_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group"
                    >
                      <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 text-gray-900 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow">
                        <ExternalLink className="h-4 w-4" /> Watch on TikTok
                      </span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
                  <Zap className="h-16 w-16 text-pink-200" />
                </div>
              )}

              {/* Engagement metrics — 2×2 on mobile, 4-col on sm+ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-gray-100 divide-y sm:divide-y-0">
                {[
                  { icon: Eye, label: 'Views', value: formatNumber(Number(v.views ?? 0)) },
                  { icon: Heart, label: 'Likes', value: formatNumber(Number(v.likes ?? 0)) },
                  { icon: Share2, label: 'Shares', value: formatNumber(Number(v.shares ?? 0)) },
                  { icon: MessageCircle, label: 'Comments', value: formatNumber(Number(v.comments ?? 0)) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex flex-col items-center justify-center py-4 px-2 bg-white">
                    <Icon className="h-4 w-4 text-pink-400 mb-1" />
                    <div className="text-sm font-bold text-gray-900 leading-none">{value}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Viral Score Breakdown */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-pink-500" />
                <h2 className="text-sm font-semibold text-gray-900">Viral Score Breakdown</h2>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Engagement rate', value: `${engagementRate}%` },
                  { label: 'Share amplification', value: `${formatNumber(Number(v.shares ?? 0))} shares` },
                  { label: 'Viral score', value: `${Number(v.viral_score ?? 0).toFixed(1)} / 100`, highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className={highlight ? 'font-bold text-pink-600' : 'font-medium text-gray-900'}>{value}</span>
                  </div>
                ))}
                {/* Score bar */}
                <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all"
                    style={{ width: `${Math.min(Number(v.viral_score ?? 0), 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: AI Viral Breakdown ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-pink-100">
            <CardContent className="p-5">
              {/* Panel header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-pink-50">
                <span className="text-lg">🚀</span>
                <h2 className="text-sm font-bold text-gray-900">AI Viral Breakdown</h2>
              </div>

              <div className="space-y-3">
                {/* Category */}
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Tag className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">Category</p>
                    <p className="text-sm font-semibold text-blue-900">{niche}</p>
                  </div>
                </div>

                {/* Pain Point */}
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">Pain Point</p>
                    <p className="text-sm font-semibold text-amber-900">{insights.painPoint}</p>
                  </div>
                </div>

                {/* Hook Type */}
                <div className="flex items-start gap-3 p-3 bg-violet-50 rounded-lg">
                  <Zap className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-0.5">Hook Style</p>
                    <p className="text-sm font-semibold text-violet-900">{insights.hookType}</p>
                  </div>
                </div>

                {/* Selling Points */}
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <Sparkles className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-0.5">Selling Points</p>
                    <p className="text-sm font-semibold text-green-900">{insights.usp}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Extracted Script / Caption */}
          {insights.caption && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">📝 Extracted Caption</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3 italic">
                  &ldquo;{insights.caption}&rdquo;
                </p>
              </CardContent>
            </Card>
          )}

          {/* ✨ Clone & Rewrite — primary CTA */}
          <Link href={cloneHref}>
            <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all text-sm">
              <Sparkles className="h-4 w-4" />
              ✨ Clone &amp; Rewrite with AI
            </button>
          </Link>

          {/* Watch on TikTok — secondary */}
          {v.video_url && (
            <a href={String(v.video_url)} target="_blank" rel="noopener noreferrer">
              <button className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition-colors text-sm">
                <ExternalLink className="h-4 w-4" /> Watch Original on TikTok
              </button>
            </a>
          )}

          {/* Similar Products */}
          {similar.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Similar in {niche}</h3>
                <div className="space-y-1.5">
                  {similar.map((p: Record<string, unknown>) => (
                    <Link key={String(p.id)} href={`/products/${p.id}`} className="block">
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <span className="text-xs text-gray-700 font-medium truncate pr-2">
                          {String(p.product_name ?? p.title ?? '')}
                        </span>
                        <ViralScoreBadge score={Math.round(Number(p.viral_score ?? 0))} showLabel={false} className="shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile CTA — shown only on small screens */}
      <div className="mt-6 sm:hidden">
        <Link href={cloneHref}>
          <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-4 rounded-xl shadow-md text-sm">
            <Sparkles className="h-4 w-4" />
            ✨ Clone &amp; Rewrite with AI
          </button>
        </Link>
      </div>
    </div>
  )
}
