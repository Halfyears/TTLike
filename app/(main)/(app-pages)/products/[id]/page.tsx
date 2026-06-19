import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Eye, Heart, Share2, MessageCircle,
  ExternalLink, Zap, TrendingUp, Tag, AlertCircle, Sparkles,
  Calendar, CheckCircle, Film, Users, Clapperboard, MousePointerClick,
  Wand2, ListChecks,
} from 'lucide-react'
import { CommentsPanel } from './CommentsPanel'
import { Card, CardContent } from '@/components/ui/Card'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import { Badge } from '@/components/ui/Badge'
import { LocalDate } from '@/components/ui/LocalDate'
import { VideoBreakdownWithTier } from '@/components/VideoBreakdownWithTier'
import { StructuralHealthReport } from '@/components/StructuralHealthReport'
import { formatNumber } from '@/lib/utils'
import { syntheticScriptCount, scriptCountLabel } from '@/lib/utils/social-proof'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'
import { getD1Database } from '@/lib/cloudflare/env'
import { safeJsonLd } from '@/lib/security/jsonLd'

export const dynamic = 'force-dynamic'

// ─── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const v = await getVideo(id)
  if (!v) return { title: 'Product Not Found · TTLike' }

  const rawTitle  = String(v.title ?? v.product_name ?? '')
  const cleanName = v.product_name
    ? String(v.product_name)
    : rawTitle.replace(/#[\w一-龥＀-￯]+\s*/g, '').replace(/\s{2,}/g, ' ').trim() || rawTitle
  const niche       = String(v.niche ?? 'General')
  const viralScore  = Number(v.viral_score ?? 0)
  const views       = Number(v.views ?? 0)
  const viewsStr    = views >= 1_000_000 ? `${(views / 1_000_000).toFixed(1)}M` : views >= 1000 ? `${Math.round(views / 1000)}K` : String(views)
  const description = `${cleanName} — viral TikTok ${niche.toLowerCase()} product with ${viewsStr} views and a ${viralScore}/100 viral score. AI breakdown, hook analysis, and script ideas.`

  return {
    title: `${cleanName} · TTLike`,
    description,
    alternates: { canonical: `${SITE_URL}/products/${id}` },
    openGraph: {
      title:       `${cleanName} — TikTok Viral Product`,
      description,
      url:         `${SITE_URL}/products/${id}`,
      images:      v.cover_url ? [{ url: String(v.cover_url), width: 720, height: 1280, alt: cleanName }] : [],
    },
  }
}

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}

// ─── Data fetching ────────────────────────────────────────────────────────────

// cache() deduplicates calls within a single request — generateMetadata and the
// page component both call getVideo(id); cache() ensures only one DB round-trip.
const getVideo = cache(async function getVideo(id: string) {
  const db = await getD1Database()
  if (db) {
    return db.prepare('SELECT * FROM tiktok_videos WHERE id = ? LIMIT 1').bind(id).first()
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !anonKey) return null

  const url = new URL('/rest/v1/tiktok_videos', base)
  url.searchParams.set('select', '*')
  url.searchParams.set('id', `eq.${id}`)
  url.searchParams.set('limit', '1')

  const res = await fetch(url.toString(), {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const rows = await res.json()
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
})

async function getSimilar(niche: string, excludeId: string) {
  const db = await getD1Database()
  if (db) {
    const { results = [] } = await db.prepare(`
      SELECT id, product_name, title, viral_score
      FROM tiktok_videos
      WHERE niche = ? AND id != ? AND deleted_at IS NULL
      ORDER BY viral_score DESC
      LIMIT 4
    `).bind(niche, excludeId).all()
    return results
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !anonKey) return []

  const url = new URL('/rest/v1/tiktok_videos', base)
  url.searchParams.set('select', 'id,product_name,title,viral_score')
  url.searchParams.set('niche', `eq.${niche}`)
  url.searchParams.set('id', `neq.${excludeId}`)
  url.searchParams.set('order', 'viral_score.desc')
  url.searchParams.set('limit', '4')

  const res = await fetch(url.toString(), {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const rows = await res.json()
  return Array.isArray(rows) ? rows : []
}

// ─── Title helpers ────────────────────────────────────────────────────────────

function extractHashtags(text: string): string[] {
  return (text.match(/#[\w一-龥＀-￯]+/g) ?? []).map(h => h.slice(1))
}

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

  const stripped = rawTitle.replace(/#[\w一-龥＀-￯]+\s*/g, '').trim()
  const sentences = stripped
    .split(/[.!|•·\n]+/)
    .map(s => s.replace(/[,;:]+$/, '').trim())
    .filter(s => s.length > 10 && s.length < 160 && !/^(https?|www|@)/i.test(s))

  for (const s of sentences.slice(0, 3)) {
    bullets.push(s.charAt(0).toUpperCase() + s.slice(1))
  }

  const fill   = NICHE_BULLETS[niche] ?? NICHE_BULLETS['General']
  const needed = Math.max(0, 3 - bullets.length)
  bullets.push(...fill.slice(0, needed))

  if (views >= 1_000_000) {
    bullets.push(`${(views / 1_000_000).toFixed(1)}M+ views — viral on TikTok`)
  } else if (views >= 100_000) {
    bullets.push(`${Math.round(views / 1000)}K+ views — trending now`)
  }

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
  if (/\?|why|are you|do you/.test(text))                              hookType = 'Question'
  else if (/can't believe|had no idea|shocked|never knew/.test(text))  hookType = 'Surprise'
  else if (/stop |pov:|vs |instead of|ditch/.test(text))               hookType = 'Contrarian'
  else if (/i spent|i tried|i bought|after \d|years of/.test(text))    hookType = 'Story'
  else if (/everyone|selling out|going viral|trending/.test(text))      hookType = 'FOMO'
  else if (/did you know|tip:|hack:|secret|fact/.test(text))            hookType = 'Educational'

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

  const rawTitle = String(v.title ?? '')
  const openingHook = rawTitle
    .replace(/#[\w一-龥＀-￯]+\s*/g, '')
    .split(/[.!?\n]/)[0]
    .trim()
    .slice(0, 120) || '—'

  let contentFormat = 'Product Demo & Review'
  if (/story|pov:|i tried|i bought|i found/.test(text))          contentFormat = 'Personal Story'
  else if (/how to|tutorial|step|guide|learn/.test(text))         contentFormat = 'Tutorial / How-To'
  else if (/unboxing|first look|haul/.test(text))                 contentFormat = 'Unboxing / Haul'
  else if (/vs |compared|instead of|ditch|switch/.test(text))     contentFormat = 'Comparison'
  else if (/before.*after|transformation|glow.?up/.test(text))   contentFormat = 'Before & After'

  let editingPace = 'Moderate pacing with clear product demonstrations'
  if (engRate > 0.12 || shares > 50_000)
    editingPace = 'Fast cuts & high energy — keeps viewers hooked to the end'
  else if (/tutorial|how to|step/.test(text))
    editingPace = 'Steady pace with clear step-by-step transitions'
  else if (/satisfying|asmr|relaxing/.test(text))
    editingPace = 'Slow, satisfying cuts with ambient or minimal sound'

  let ctaPlacement = 'Product reveal at the end drives curiosity'
  if (/link in bio|shop now|get yours|order|buy/.test(text))
    ctaPlacement = 'Explicit on-screen CTA — link in bio / swipe up'
  else if (hookType === 'Question')
    ctaPlacement = 'Answer-reveal format — viewer watches to the end'
  else if (shares / Math.max(views, 1) > 0.04)
    ctaPlacement = 'Organic share trigger — no hard sell, lets product speak'

  let targetAudience = 'Online shoppers aged 18–35'
  if (/mom|baby|kid|parent|family/.test(text))    targetAudience = 'Parents & families'
  else if (/gym|workout|fitness|athletic/.test(text)) targetAudience = 'Fitness enthusiasts'
  else if (/student|college|dorm/.test(text))     targetAudience = 'Students & young adults'
  else if (/office|professional|desk/.test(text))  targetAudience = 'Working professionals'
  else if (/senior|elderly|arthritis/.test(text))  targetAudience = 'Older adults (50+)'

  let visualStyle = 'Clean product-focused shots, neutral background'
  if (/aesthetic|minimal|clean/.test(text))       visualStyle = 'Minimalist aesthetic — white or neutral backdrop'
  else if (/kitchen|cooking|food/.test(text))     visualStyle = 'Kitchen environment with natural lighting'
  else if (/outdoor|nature|travel/.test(text))    visualStyle = 'Natural outdoor setting'
  else if (/makeup|skincare|beauty/.test(text))   visualStyle = 'Close-up beauty shots with ring-light setup'
  else if (/gym|fitness|workout/.test(text))      visualStyle = 'Action shots in gym or home workout space'

  return { openingHook, contentFormat, editingPace, ctaPlacement, targetAudience, visualStyle }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductDetailPage({ params, searchParams }: Props) {
  const { id }      = await params
  const sq          = await searchParams
  const autoAnalyze = sq?.auto_analyze === '1'

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

  // Shoot-ready CTA: deep-link to Studio pre-filled with this video's URL
  const studioHref = v.video_url
    ? `/studio?url=${encodeURIComponent(String(v.video_url))}`
    : '/studio'

  // ── trendradar SIGNAL badge ──────────────────────────────────────────────────
  const viralScore  = Number(v.viral_score ?? 0)
  const signalViews = Number(v.views  ?? 0)
  const signalLikes = Number(v.likes  ?? 0)
  const signalShare = Number(v.shares ?? 0)
  const signalEngRate = signalViews > 0
    ? ((signalLikes + signalShare) / signalViews * 100).toFixed(1)
    : '0.0'
  const signal = viralScore >= 85
    ? { label: 'VIRAL',    color: 'text-pink-600   border-pink-300   bg-pink-50/60'   }
    : viralScore >= 65
    ? { label: 'RISING',   color: 'text-orange-600 border-orange-300 bg-orange-50/60' }
    : viralScore >= 45
    ? { label: 'TRENDING', color: 'text-amber-600  border-amber-300  bg-amber-50/60'  }
    : { label: 'STABLE',   color: 'text-gray-500   border-gray-200   bg-gray-50'      }

  // ── JSON-LD structured data ───────────────────────────────────────────────
  const productSchema = {
    '@context':        'https://schema.org',
    '@type':           'ItemPage',
    name:              `${cleanName} — TikTok Viral Product Analysis`,
    description:       `${cleanName} — viral TikTok ${niche.toLowerCase()} product with a ${viralScore}/100 viral score. See AI hook breakdown and generate your own shoot-ready script.`,
    url:               `${SITE_URL}/products/${id}`,
    ...(v.cover_url ? { image: String(v.cover_url) } : {}),
    inLanguage:        'en',
    isPartOf:          { '@type': 'WebSite', name: 'TTLike', url: SITE_URL },
    about: {
      '@type':  'Thing',
      name:     cleanName,
      category: niche,
    },
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: [
      {
        '@type':          'Question',
        name:             `Why is ${cleanName} going viral on TikTok?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:    `${cleanName} is a ${niche.toLowerCase()} product with a viral score of ${viralScore}/100 on TTLike. High-performing TikTok products typically combine a strong visual hook with a clear pain-point story and an impulse-buy price point. This product hits all three.`,
        },
      },
      {
        '@type':          'Question',
        name:             `How do I make a TikTok video about ${cleanName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:    `Use TTLike's Viral Studio: paste this product's TikTok URL, confirm the product details, and get a scene-by-scene shoot-ready script with hook, body, and CTA — all in about 20 seconds. The script includes a pre-shoot checklist so you can film in one take.`,
        },
      },
      {
        '@type':          'Question',
        name:             `What niche does ${cleanName} belong to?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:    `${cleanName} is tracked under the ${niche} niche on TTLike. Browse more ${niche} viral products at TTLike.com/products.`,
        },
      },
      {
        '@type':          'Question',
        name:             `What is a TTLike viral score?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:    `TTLike's viral score (0–100) combines view count, engagement rate (likes + comments + shares), recency, and hook-pattern strength. A score above 80 means the product is currently trending hard on TikTok.`,
        },
      },
    ],
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* ── Title section ── */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge>{niche}</Badge>
            <ViralScoreBadge score={Math.round(Number(v.viral_score ?? 0))} />
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
            {cleanName}
          </h1>
          <div className="flex items-center gap-3 flex-wrap mt-1.5">
            {v.author && <p className="text-gray-500 text-sm">@{String(v.author)}</p>}
            {(v.published_at || v.created_at) && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="h-3 w-3" />
                <LocalDate date={String(v.published_at ?? v.created_at)} />
                {!v.published_at && (
                  <span className="text-gray-300 text-[10px]">(scraped)</span>
                )}
              </span>
            )}
          </div>
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

        {/* Shoot-Ready CTA — desktop header (Link styled as button, no nested <button>) */}
        <Link
          href={studioHref}
          className="hidden sm:inline-flex shrink-0 items-center gap-2 px-5 min-h-[44px] bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 text-white font-semibold rounded-xl text-sm transition-opacity shadow-sm"
        >
          <Wand2 className="h-4 w-4" /> Generate Shoot-Ready Script
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
                    alt={cleanName.slice(0, 80) || 'Product video cover'}
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

              {/* ── trendradar SIGNAL strip ── */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-white">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                  Engagement Signal
                </span>
                <span className={`font-mono text-[10px] font-bold border px-2 py-0.5 rounded tracking-widest uppercase ${signal.color}`}>
                  [ SIGNAL: {signal.label} &nbsp;+{signalEngRate}% ]
                </span>
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

          {/* ── Viral Score Breakdown ── */}
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

          {/* ── Featured Comments ── */}
          <CommentsPanel productId={id} videoUrl={v.video_url ? String(v.video_url) : null} />
        </div>

        {/* ── RIGHT col (2/5) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Module 1: AI Viral Breakdown (static labels) ── */}
          <Card className="border-pink-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-pink-50">
                <span className="text-lg">🚀</span>
                <h2 className="text-sm font-bold text-gray-900">AI Viral Breakdown</h2>
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-100 uppercase tracking-wide">
                  Surface
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-2.5 bg-blue-50 rounded-lg">
                  <Tag className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">Category</p>
                    <p className="text-xs font-semibold text-blue-900">{niche}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 bg-amber-50 rounded-lg">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-0.5">Pain Point</p>
                    <p className="text-xs font-semibold text-amber-900">{insights.painPoint}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 bg-violet-50 rounded-lg">
                  <Zap className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-0.5">Hook Style</p>
                    <p className="text-xs font-semibold text-violet-900">{insights.hookType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 bg-green-50 rounded-lg">
                  <Sparkles className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-0.5">Selling Points</p>
                    <p className="text-xs font-semibold text-green-900">{insights.usp}</p>
                  </div>
                </div>
                {/* Production Insights sub-labels */}
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Production Insights</p>
                  <div className="space-y-2">
                    {[
                      { icon: Film,              label: 'Content Format',   value: videoAnalysis.contentFormat,   color: 'text-blue-500' },
                      { icon: TrendingUp,        label: 'Editing Pace',     value: videoAnalysis.editingPace,     color: 'text-pink-500' },
                      { icon: MousePointerClick, label: 'CTA Placement',    value: videoAnalysis.ctaPlacement,    color: 'text-orange-500' },
                      { icon: Users,             label: 'Target Audience',  value: videoAnalysis.targetAudience,  color: 'text-violet-500' },
                      { icon: Clapperboard,      label: 'Visual Style',     value: videoAnalysis.visualStyle,     color: 'text-green-500' },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="flex items-start gap-2">
                        <Icon className={`h-3.5 w-3.5 ${color} shrink-0 mt-0.5`} />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 leading-none">{label}</p>
                          <p className="text-sm text-gray-700 mt-0.5 leading-snug">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Shoot-Ready CTA ── */}
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <ListChecks className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Ready to film this?</p>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Make your own version</h3>
            <p className="text-sm text-gray-500 mb-3 leading-relaxed">
              Generate a shoot-ready script and pre-shoot checklist for this product — in ~20 seconds.
            </p>
            {/* Social proof badge */}
            <div className="flex items-center gap-1.5 mb-4">
              <div className="flex -space-x-1">
                {['bg-pink-400','bg-violet-400','bg-teal-400'].map((c,i) => (
                  <div key={i} className={`w-5 h-5 rounded-full ${c} border-2 border-white`} />
                ))}
              </div>
              <span className="text-xs text-emerald-700 font-medium">
                🎬 {scriptCountLabel(syntheticScriptCount(String(v.id), Number(v.viral_score ?? 50)))}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {/* Single <Link> styled as button — no nested <button> inside <a> */}
              <Link
                href={studioHref}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold min-h-[48px] px-4 rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
              >
                <Wand2 className="h-4 w-4" />
                Generate Shoot-Ready Script
              </Link>
              {v.video_url && (
                <a
                  href={String(v.video_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium min-h-[44px] px-4 rounded-xl transition-colors text-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Watch Original on TikTok
                </a>
              )}
            </div>
          </div>

          {/* ── Module 2: AI Inspiration Engine (on demand) ── */}
          <Card className="border-indigo-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-50">
                <span className="text-base">🎬</span>
                <h2 className="text-sm font-bold text-gray-900">AI Inspiration Engine</h2>
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wide">
                  AI · On Demand
                </span>
              </div>
              <VideoBreakdownWithTier videoId={id} autoLoad={autoAnalyze} />
            </CardContent>
          </Card>

          {/* ── Module 3: AI Structural Health Report (premium) ── */}
          <Card className="border-red-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-50">
                <span className="text-base">🔬</span>
                <h2 className="text-sm font-bold text-gray-900">AI Structural Health Report</h2>
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">
                  Premium
                </span>
              </div>
              <StructuralHealthReport videoId={id} />
            </CardContent>
          </Card>

          {/* Watch on TikTok moved into Shoot-Ready CTA card above */}

          {/* ── Similar Products ── */}
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

      {/* Mobile CTA (Link styled as button) */}
      <div className="mt-6 sm:hidden">
        <Link
          href={studioHref}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 text-white font-bold min-h-[52px] px-4 rounded-xl shadow-md text-sm transition-opacity"
        >
          <Wand2 className="h-4 w-4" />
          Generate Shoot-Ready Script
        </Link>
      </div>
    </div>
  )
}
