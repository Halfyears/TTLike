import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Heart, Share2, Sparkles, ExternalLink, Zap } from 'lucide-react'
import { SITE_URL, SITE_NAME } from '@/lib/constants'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'
import { VideoAnalysis } from '@/components/VideoAnalysis'

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getBreakdownWithVideo(videoId: string) {
  const base    = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }

  const url = new URL(`/rest/v1/video_breakdowns`, base)
  url.searchParams.set('select', 'payload,created_at,video_id,tiktok_videos(id,title,product_name,niche,cover_url,video_url,author,views,likes,shares,viral_score)')
  url.searchParams.set('video_id', `eq.${videoId}`)
  url.searchParams.set('limit', '1')

  const res = await fetch(url.toString(), { headers, next: { revalidate: 3600 } })
  if (!res.ok) return null
  const rows = await res.json()
  if (!Array.isArray(rows) || rows.length === 0) return null

  const row = rows[0]
  const video    = row.tiktok_videos as Record<string, unknown> | null
  const breakdown = row.payload as VideoBreakdownPayload | null

  // Support V2.5 (viral_formulas) and legacy (analysis) payloads
  if (!video || !breakdown) return null
  const hasV25     = breakdown.viral_formulas?.length > 0
  const hasLegacy  = !!((breakdown as unknown) as Record<string, unknown>).analysis
  if (!hasV25 && !hasLegacy) return null

  return { video, breakdown, created_at: row.created_at as string }
}

// ── Clean title helper ────────────────────────────────────────────────────────

function cleanTitle(text: string): string {
  return text
    .replace(/#[\w一-龥＀-￯]+\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ── Metadata ──────────────────────────────────────────────────────────────────

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const result = await getBreakdownWithVideo(id)
  if (!result) return { title: 'Ad Strategy Breakdown | TTLike' }

  const { video, breakdown } = result
  const productName  = String(video.product_name ?? video.title ?? 'Viral Product')
  const cleanName    = cleanTitle(productName)
  const niche        = String(video.niche ?? 'E-Commerce')
  const views        = Number(video.views ?? 0)

  const firstFormula = breakdown.viral_formulas?.[0]
  const strategyName = firstFormula?.title ?? 'Viral Ad Strategy'

  const title       = `${cleanName} — ${strategyName} | ${SITE_NAME}`
  const description = `Reverse-engineer how this viral TikTok ad reached ${(views / 1000).toFixed(0)}K+ views. Full breakdown: viral formulas, copy-paste scripts, visual timeline & seller tips.`

  return {
    title,
    description,
    keywords: [
      'TikTok viral strategy', 'TikTok ad breakdown', strategyName, niche,
      'UGC script', 'TikTok hook', 'viral ad analysis', 'TTLike',
    ].join(', '),
    openGraph: {
      title,
      description,
      type:   'article',
      url:    `${SITE_URL}/viral/${id}`,
      images: video.cover_url ? [{ url: String(video.cover_url), width: 720, height: 405 }] : [],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      video.cover_url ? [String(video.cover_url)] : [],
    },
    alternates: { canonical: `${SITE_URL}/viral/${id}` },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ViralBreakdownPage({ params }: Props) {
  const { id } = await params
  const result = await getBreakdownWithVideo(id)
  if (!result) notFound()

  const { video, breakdown, created_at } = result

  const productName  = String(video.product_name ?? video.title ?? 'Viral Product')
  const cleanName    = cleanTitle(productName)
  const niche        = String(video.niche ?? 'E-Commerce')
  const viralScore   = Number(video.viral_score ?? 0)

  const firstFormula = breakdown.viral_formulas?.[0]
  const strategyName = firstFormula?.title ?? 'Viral Ad Strategy'

  const cloneHref = `/dashboard/ai-scripts?from_video=${encodeURIComponent(id)}&suggested_title=${encodeURIComponent(cleanName)}&niche=${encodeURIComponent(niche)}&keywords=${encodeURIComponent(productName)}`

  // ── JSON-LD structured data ─────────────────────────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${cleanName} — ${strategyName}`,
    description: `Full TikTok ad structure breakdown: viral formulas, copy-paste scripts, visual timeline`,
    image: video.cover_url ? String(video.cover_url) : undefined,
    datePublished: created_at,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/viral/${id}` },
    keywords: `TikTok ad strategy, ${strategyName}, ${niche}, viral marketing`,
  }

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10">

        {/* Back link */}
        <Link href={`/products/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Product
        </Link>

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700">
              {niche}
            </span>
            {viralScore > 0 && (
              <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700">
                🔥 Viral Score {viralScore.toFixed(0)}
              </span>
            )}
            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-wide">
              ✦ Inspiration Engine V2.5
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
            {cleanName}
          </h1>
          {video.author != null && (
            <p className="text-sm text-gray-400 mt-1">@{String(video.author)}</p>
          )}
        </div>

        {/* ── Cover + metrics ── */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 mb-6">
          {video.cover_url ? (
            <div className="relative aspect-video bg-gray-100">
              <img
                src={String(video.cover_url)}
                alt={cleanName.slice(0, 80) || 'Product video cover'}
                className="w-full h-full object-cover object-center"
              />
              {video.video_url != null && (
                <a
                  href={String(video.video_url)}
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

          {/* Metrics strip */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white">
            {[
              { icon: Eye,    label: 'Views',  value: breakdown.metrics?.views  ?? '—' },
              { icon: Heart,  label: 'Likes',  value: breakdown.metrics?.likes  ?? '—' },
              { icon: Share2, label: 'Shares', value: breakdown.metrics?.shares ?? '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center justify-center py-3.5 px-2">
                <Icon className="h-3.5 w-3.5 text-pink-400 mb-1" />
                <span className="text-sm font-bold text-gray-900 tabular-nums">{value}</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Breakdown report ── */}
        <div className="mb-6">
          <VideoAnalysis data={breakdown} hasReport={true} />
        </div>

        {/* ── CTA strip ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={cloneHref} className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-all text-sm">
              <Sparkles className="h-4 w-4" />
              Clone This Strategy with AI
            </button>
          </Link>
          <Link href="/products" className="sm:w-44">
            <button className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-3.5 rounded-xl transition-colors text-sm">
              Browse More Virals
            </button>
          </Link>
        </div>

        {/* ── SEO footer note ── */}
        <p className="mt-8 text-center text-xs text-gray-400">
          This breakdown was AI-generated by {SITE_NAME} · Powered by Gemini 2.5 Flash
        </p>
      </div>
    </>
  )
}
