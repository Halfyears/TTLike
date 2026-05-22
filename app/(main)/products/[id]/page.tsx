import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Eye, Heart, Share2, MessageCircle,
  ExternalLink, Zap, TrendingUp, Tag, AlertCircle, Sparkles,
  Calendar, CheckCircle, Film, Users, Clapperboard, MousePointerClick,
} from 'lucide-react'
import { CommentsPanel } from './CommentsPanel'
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

// ─── Title helpers ────────────────────────────────────────────────────────────

/** Extract hashtag strings (without the # prefix) */
function extractHashtags(text: string): string[] {
  return (text.match(/#[\w一-龥＀-￯]+/g) ?? []).map(h => h.slice(1))
}

/** Return title with all hashtags stripped */
function cleanTitle(text: string): string {
  return text
    .replace(/#[\w一-龥＀-￯]+\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ─── Product Description bullets ─────────────────────────────────────────────

const NICHE_BULLETS: Record<string, string[]> = {
  'Beauty':   ['Suitable for all skin types', 'Dermatologist-friendly formula', 'Visible results within days'],
  'Fitness':  ['No gym membership needed', 'Compact and portable design', 'Suitable for all fitness levels'],
  'Kitchen':  ['Cuts meal prep time significantly', 'Dishwasher safe and easy to clean', 'Space-saving design'],
  'Tech':     ['No complicated setup required', 'Compatible with most devices', 'Long battery life'],
  'Home':     ['Instantly refreshes any space', 'Simple installation — no tools needed', 'Durable everyday materials'],
  'Pets':     ['Vet-tested and approved', 'Gentle formula safe for daily use', 'Loved by pets and owners alike'],
  'Travel':   ['Lightweight and compact', 'TSA-approved carry-on friendly', 'Built for frequent travelers'],
  'Health':   ['Clinically tested ingredients', 'No prescription required', 'Suitable for daily use'],
  'General':  ['Premium quality materials', 'Easy to use right out of the box', 'Backed by thousands of reviews'],
}

function deriveProductBullets(v: Record<string, unknown>): string[] {
  const rawTitle = String(v.title ?? v.product_name ?? '')
  const niche    = String(v.niche ?? 'General')
  const views    = Number(v.views  ?? 0)
  const likes    = Number(v.likes  ?? 0)
  const shares   = Number(v.shares ?? 0)

  const bullets: string[] = []

  // Clean sentences from the video caption
  const stripped = rawTitle.replace(/#[\w一-龥＀-￯]+\s*/g, '').trim()
  const sentences = stripped
    .split(/[.!|•·\n]+/)
    .map(s => s.replace(/[,;:]+$/, '').trim())
    .filter(s => s.length > 10 && s.length < 160 && !/^(https?|www|@)/i.test(s))

  for (const s of sentences.slice(0, 3)) {
    bullets.push(s.charAt(0).toUpperCase() + s.slice(1))
  }

  // Fill remaining with niche-specific benefit bullets
  const fill = NICHE_BULLETS[niche] ?? NICHE_BULLETS['General']
  const needed = Math.max(0, 3 - bullets.length)
  bullets.push(...fill.slice(0, needed))

  // Social proof bullet
  if (views >= 1_000_000) {
    bullets.push(`${(views / 1_000_000).toFixed(1)}M+ views — viral on TikTok`)
  } else if (views >= 100_000) {
    bullets.push(`${Math.round(views / 1000)}K+ views — trending now`)
  }

  // High share bullet
  if (shares >= 10_000) {
    bullets.push(`Shared ${formatNumber(shares)} times — highly recommended by viewers`)
  } else if (likes > 0 && views > 0 && likes / views > 0.12) {
    bullets.push('Exceptional like rate — audiences love this product')
  }

  return bullets.slice(0, 6)
}

// ─── Video production analysis ────────────────────────────────────────────────

const NICHE_PAIN: Record<string, string> = {
  'Beauty':   'Appearance & skin confidence',
  'Fitness':  'Low energy / poor performance',
  'Home':     'Messy or inefficient living space',
  'Kitchen':  'Cooking is slow or messy',
  'Tech':     'Device frustration & wasted time',
  'Fashion':  'Style confidence / fit issues',
  'Pets':     'Pet health & owner guilt',
  'Travel':   'Gear gaps on adventures',
  'Health':   'Pain, discomfort or low wellness',
  'General':  'Everyday inconvenience',
}

const NICHE_USP: Record<string, string> = {
  'Beauty':   'Visible results fast • No prescription needed',
  'Fitness':  'Works at home • No gym required',
  'Home':     'Instant before/after • Zero effort cleanup',
  'Kitchen':  'Saves time • Easy cleanup',
  'Tech':     'One-tap solution • Plug & play',
  'Fashion':  'Instant style upgrade • Affordable luxury',
  'Pets':     'Vet-approved • Pets love it',
  'Travel':   'Lightweight • Built to last',
  'Health':   'Natural ingredients • Doctor-friendly',
  'General':  'Affordable • High quality • Fast shipping',
}

function deriveInsights(v: Record<string, unknown>) {
  const text  = `${v.title ?? ''} ${v.product_name ?? ''}`.toLowerCase()
  const niche = String(v.niche ?? 'General')

  let hookType = 'Emotional'
  if (/\?|why|are you|do you/.test(text))                         hookType = 'Question'
  else if (/can't believe|had no idea|shocked|never knew/.test(text)) hookType = 'Surprise'
  else if (/stop |pov:|vs |instead of|ditch/.test(text))           hookType = 'Contrarian'
  else if (/i spent|i tried|i bought|after \d|years of/.test(text)) hookType = 'Story'
  else if (/everyone|selling out|going viral|trending/.test(text)) hookType = 'FOMO'
  else if (/did you know|tip:|hack:|secret|fact/.test(text))       hookType = 'Educational'

  const painPoint = NICHE_PAIN[niche]  ?? NICHE_PAIN['General']!
  const usp       = NICHE_USP[niche]   ?? NICHE_USP['General']!

  return { hookType, painPoint, usp }
}

function deriveVideoAnalysis(v: Record<string, unknown>, hookType: string) {
  const text   = `${v.title ?? ''} ${v.product_name ?? ''}`.toLowerCase()
  const views  = Number(v.views  ?? 0)
  const likes  = Number(v.likes  ?? 0)
  const shares = Number(v.shares ?? 0)
  const engRate = views > 0 ? (likes + shares * 3) / views : 0

  // Opening hook line
  const rawTitle = String(v.title ?? '')
  const openingHook = rawTitle
    .replace(/#[\w一-龥＀-￯]+\s*/g, '')
    .split(/[.!?\n]/)[0]
    .trim()
    .slice(0, 120) || '—'

  // Content format
  let contentFormat = 'Product Demo & Review'
  if (/story|pov:|i tried|i bought|i found/.test(text))          contentFormat = 'Personal Story'
  else if (/how to|tutorial|step|guide|learn/.test(text))         contentFormat = 'Tutorial / How-To'
  else if (/unboxing|first look|haul/.test(text))                 contentFormat = 'Unboxing / Haul'
  else if (/vs |compared|instead of|ditch|switch/.test(text))     contentFormat = 'Comparison'
  else if (/before.*after|transformation|glow.?up/.test(text))   contentFormat = 'Before & After'

  // Editing pace
  let editingPace = 'Moderate pacing with clear product demonstrations'
  if (engRate > 0.12 || shares > 50_000)
    editingPace = 'Fast cuts & high energy — keeps viewers hooked to the end'
  else if (/tutorial|how to|step/.test(text))
    editingPace = 'Steady pace with clear step-by-step transitions'
  else if (/satisfying|asmr|relaxing/.test(text))
    editingPace = 'Slow, satisfying cuts with ambient or minimal sound'

  // CTA placement
  let ctaPlacement = 'Product reveal at the end drives curiosity'
  if (/link in bio|shop now|get yours|order|buy/.test(text))
    ctaPlacement = 'Explicit on-screen CTA — link in bio / swipe up'
  else if (hookType === 'Question')
    ctaPlacement = 'Answer-reveal format — viewer watches to the end'
  else if (shares / Math.max(views, 1) > 0.04)
    ctaPlacement = 'Organic share trigger — no hard sell, lets product speak'

  // Target audience
  let targetAudience = 'Online shoppers aged 18–35'
  if (/mom|baby|kid|parent|family/.test(text))   targetAudience = 'Parents & families'
  else if (/gym|workout|fitness|athletic/.test(text)) targetAudience = 'Fitness enthusiasts'
  else if (/student|college|dorm/.test(text))    targetAudience = 'Students & young adults'
  else if (/office|professional|desk/.test(text)) targetAudience = 'Working professionals'
  else if (/senior|elderly|arthritis/.test(text)) targetAudience = 'Older adults (50+)'

  // Visual style
  let visualStyle = 'Clean product-focused shots, neutral background'
  if (/aesthetic|minimal|clean/.test(text))      visualStyle = 'Minimalist aesthetic — white or neutral backdrop'
  else if (/kitchen|cooking|food/.test(text))    visualStyle = 'Kitchen environment with natural lighting'
  else if (/outdoor|nature|travel/.test(text))   visualStyle = 'Natural outdoor setting'
  else if (/makeup|skincare|beauty/.test(text))  visualStyle = 'Close-up beauty shots with ring-light setup'
  else if (/gym|fitness|workout/.test(text))     visualStyle = 'Action shots in gym or home workout space'

  return { openingHook, contentFormat, editingPace, ctaPlacement, targetAudience, visualStyle }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const v = await getVideo(id)
  if (!v) notFound()

  const rawTitle      = String(v.title ?? v.product_name ?? 'Untitled')
  const hashtags      = extractHashtags(rawTitle)
  const cleanName     = v.product_name
    ? String(v.product_name)
    : cleanTitle(rawTitle) || rawTitle
  const niche         = String(v.niche ?? 'General')
  const similar       = await getSimilar(niche, id)
  const insights      = deriveInsights(v)
  const productBullets = deriveProductBullets(v)
  const videoAnalysis  = deriveVideoAnalysis(v, insights.hookType)

  const engagementRate = Number(v.views ?? 0) > 0
    ? (((Number(v.likes ?? 0) + Number(v.shares ?? 0) * 3 + Number(v.comments ?? 0) * 2)
        / Number(v.views)) * 100).toFixed(2)
    : '0'

  const cloneHref = `/dashboard/ai-scripts?from_video=${encodeURIComponent(String(v.id))}&suggested_title=${encodeURIComponent(cleanName)}&niche=${encodeURIComponent(niche)}&keywords=${encodeURIComponent(rawTitle)}`

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* ── Title section ── */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge>{niche}</Badge>
            <ViralScoreBadge score={Math.round(Number(v.viral_score ?? 0))} />
          </div>

          {/* Clean title — no hashtags */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
            {cleanName}
          </h1>

          {/* Author + date */}
          <div className="flex items-center gap-3 flex-wrap mt-1.5">
            {v.author && <p className="text-gray-500 text-sm">@{String(v.author)}</p>}
            {(v.published_at || v.created_at) && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="h-3 w-3" />
                {new Date(String(v.published_at ?? v.created_at)).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
                {!v.published_at && (
                  <span className="text-gray-300 text-[10px]">(scraped)</span>
                )}
              </span>
            )}
          </div>

          {/* Hashtags — separate section below title */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {hashtags.map(tag => (
                <span
                  key={tag}
                  className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Clone CTA — desktop */}
        <Link href={cloneHref} className="hidden sm:block shrink-0">
          <Button size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" /> Clone &amp; Rewrite
          </Button>
        </Link>
      </div>

      {/* ── Main 2-panel layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LEFT col (3/5) ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Video cover + engagement metrics */}
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-xl">
              {v.cover_url ? (
                <div className="relative aspect-video bg-gray-100">
                  <img
                    src={String(v.cover_url)}
                    alt={cleanName.slice(0, 80)}
                    className="w-full h-full object-cover object-center"
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

              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 divide-y sm:divide-y-0">
                {[
                  { icon: Eye,           label: 'Views',    value: formatNumber(Number(v.views    ?? 0)) },
                  { icon: Heart,         label: 'Likes',    value: formatNumber(Number(v.likes    ?? 0)) },
                  { icon: Share2,        label: 'Shares',   value: formatNumber(Number(v.shares   ?? 0)) },
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

          {/* ── Product Description ── */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">📦</span>
                <h2 className="text-sm font-bold text-gray-900">Product Description</h2>
              </div>
              <ul className="space-y-2.5">
                {productBullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 leading-snug">{bullet}</span>
                  </li>
                ))}
              </ul>
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
                  { label: 'Engagement rate',       value: `${engagementRate}%` },
                  { label: 'Share amplification',   value: `${formatNumber(Number(v.shares ?? 0))} shares` },
                  { label: 'Viral score',           value: `${Number(v.viral_score ?? 0).toFixed(1)} / 100`, highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className={highlight ? 'font-bold text-pink-600' : 'font-medium text-gray-900'}>{value}</span>
                  </div>
                ))}
                <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500"
                    style={{ width: `${Math.min(Number(v.viral_score ?? 0), 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT col (2/5) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* AI Viral Breakdown */}
          <Card className="border-pink-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-pink-50">
                <span className="text-lg">🚀</span>
                <h2 className="text-sm font-bold text-gray-900">AI Viral Breakdown</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Tag className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">Category</p>
                    <p className="text-sm font-semibold text-blue-900">{niche}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">Pain Point</p>
                    <p className="text-sm font-semibold text-amber-900">{insights.painPoint}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-violet-50 rounded-lg">
                  <Zap className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-0.5">Hook Style</p>
                    <p className="text-sm font-semibold text-violet-900">{insights.hookType}</p>
                  </div>
                </div>
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

          {/* ── Video Production Analysis ── */}
          <Card className="border-slate-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
                <Clapperboard className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-gray-900">Video Analysis</h2>
              </div>

              <div className="space-y-3">
                {/* Opening hook */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Opening Hook</p>
                  <p className="text-xs text-gray-700 italic bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                    &ldquo;{videoAnalysis.openingHook}&rdquo;
                  </p>
                </div>

                {[
                  { icon: Film,              label: 'Content Format',   value: videoAnalysis.contentFormat,   color: 'text-blue-500' },
                  { icon: TrendingUp,        label: 'Editing Pace',     value: videoAnalysis.editingPace,     color: 'text-pink-500' },
                  { icon: MousePointerClick, label: 'CTA Placement',    value: videoAnalysis.ctaPlacement,    color: 'text-orange-500' },
                  { icon: Users,             label: 'Target Audience',  value: videoAnalysis.targetAudience,  color: 'text-violet-500' },
                  { icon: Sparkles,          label: 'Visual Style',     value: videoAnalysis.visualStyle,     color: 'text-green-500' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className={`h-3.5 w-3.5 ${color} shrink-0 mt-0.5`} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none">{label}</p>
                      <p className="text-xs text-gray-700 mt-0.5 leading-snug">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Clone & Rewrite CTA */}
          <Link href={cloneHref}>
            <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all text-sm">
              <Sparkles className="h-4 w-4" />
              ✨ Clone &amp; Rewrite with AI
            </button>
          </Link>

          {/* Watch on TikTok */}
          {v.video_url && (
            <a href={String(v.video_url)} target="_blank" rel="noopener noreferrer">
              <button className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition-colors text-sm">
                <ExternalLink className="h-4 w-4" /> Watch Original on TikTok
              </button>
            </a>
          )}

          {/* Featured Comments */}
          <CommentsPanel productId={id} videoUrl={v.video_url ? String(v.video_url) : null} />

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
                          {cleanTitle(String(p.product_name ?? p.title ?? ''))}
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

      {/* Mobile CTA */}
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
