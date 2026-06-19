import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Heart, Share2, Sparkles, ExternalLink, Zap } from 'lucide-react'
import { SITE_URL, SITE_NAME } from '@/lib/constants'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'
import { VideoAnalysis } from '@/components/VideoAnalysis'
import { isUuid, generateViralSlug } from '@/lib/seoSlug'
import { createServiceClient } from '@/lib/supabase/server'
import { safeJsonLd } from '@/lib/security/jsonLd'
import { parseD1Json, queryD1First, runD1 } from '@/lib/cloudflare/d1'

// ── Data fetching ──────────────────────────────────────────────────────────────

type BreakdownWithVideo = {
  seo_slug:   string | null
  payload:    VideoBreakdownPayload
  created_at: string
  video:      Record<string, unknown>
}

type D1BreakdownRow = {
  seo_slug: string | null
  payload: unknown
  created_at: string
  video_id: string | null
}

/**
 * Fetch breakdown by SEO slug (primary path).
 * Falls back to UUID lookup for legacy /viral/{uuid} URLs.
 * Returns null when nothing matches.
 */
async function getBreakdown(slug: string): Promise<BreakdownWithVideo | null> {
  const base    = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
  const select  = 'seo_slug,payload,created_at,video_id,tiktok_videos(id,title,product_name,niche,cover_url,cover_storage_url,video_url,author,views,likes,shares,viral_score)'

  /**
   * Build a synthetic video object from oEmbed source_meta when the
   * tiktok_videos join returns null (video_id = null for oEmbed breakdowns).
   */
  function syntheticVideoFromSourceMeta(breakdown: VideoBreakdownPayload): Record<string, unknown> | null {
    const sm = breakdown.source_meta
    if (!sm) return null
    return {
      id:                null,
      title:             sm.title,
      product_name:      sm.title,
      niche:             null,
      cover_url:         sm.thumbnail_url ?? null,
      cover_storage_url: null,
      video_url:         sm.video_url,
      author:            sm.author,
      views:             0,
      likes:             0,
      shares:            0,
      viral_score:       0,
    }
  }

  async function resultFromD1Row(row: D1BreakdownRow): Promise<BreakdownWithVideo | null> {
    const breakdown = parseD1Json<VideoBreakdownPayload | null>(row.payload, null)
    if (!breakdown) return null

    const hasContent = breakdown.viral_formulas?.length > 0
      || !!((breakdown as unknown as Record<string, unknown>).analysis)
    if (!hasContent) return null

    const video = row.video_id
      ? await queryD1First<Record<string, unknown>>(
        `SELECT id, title, product_name, niche, cover_url, cover_storage_url,
                video_url, author, views, likes, shares, viral_score
           FROM tiktok_videos
          WHERE id = ? AND deleted_at IS NULL
          LIMIT 1`,
        [row.video_id],
      )
      : null

    const finalVideo = video ?? syntheticVideoFromSourceMeta(breakdown)
    if (!finalVideo) return null

    return { seo_slug: row.seo_slug, payload: breakdown, created_at: row.created_at, video: finalVideo }
  }

  const d1BySlug = await queryD1First<D1BreakdownRow>(
    `SELECT seo_slug, payload, created_at, video_id
       FROM video_breakdowns
      WHERE seo_slug = ?
      LIMIT 1`,
    [slug],
  )
  if (d1BySlug) {
    const result = await resultFromD1Row(d1BySlug)
    if (result) return result
  }

  if (isUuid(slug)) {
    const d1ByUuid = await queryD1First<D1BreakdownRow>(
      `SELECT seo_slug, payload, created_at, video_id
         FROM video_breakdowns
        WHERE video_id = ? OR id = ?
        LIMIT 1`,
      [slug, slug],
    )
    if (d1ByUuid) {
      const result = await resultFromD1Row(d1ByUuid)
      if (result) return result
    }
  }

  if (!base || !anonKey) return null

  // Primary: look up by seo_slug
  const bySlug = new URL('/rest/v1/video_breakdowns', base)
  bySlug.searchParams.set('select',   select)
  bySlug.searchParams.set('seo_slug', `eq.${slug}`)
  bySlug.searchParams.set('limit',    '1')

  const r1 = await fetch(bySlug.toString(), { headers, next: { revalidate: 3600 } })
  if (r1.ok) {
    const rows = await r1.json()
    if (Array.isArray(rows) && rows.length > 0) {
      const row       = rows[0]
      const breakdown = row.payload as VideoBreakdownPayload | null
      if (!breakdown) return null
      const hasContent = breakdown.viral_formulas?.length > 0
        || !!((breakdown as unknown as Record<string, unknown>).analysis)
      if (!hasContent) return null

      // Prefer tiktok_videos join; fall back to source_meta for oEmbed rows
      const video = (row.tiktok_videos as Record<string, unknown> | null)
        ?? syntheticVideoFromSourceMeta(breakdown)
      if (!video) return null

      return { seo_slug: row.seo_slug, payload: breakdown, created_at: row.created_at, video }
    }
  }

  // Fallback: legacy UUID lookup
  if (!isUuid(slug)) return null

  const byId = new URL('/rest/v1/video_breakdowns', base)
  byId.searchParams.set('select',   select)
  byId.searchParams.set('video_id', `eq.${slug}`)
  byId.searchParams.set('limit',    '1')

  const r2 = await fetch(byId.toString(), { headers, next: { revalidate: 3600 } })
  if (!r2.ok) return null
  const rows2 = await r2.json()
  if (!Array.isArray(rows2) || rows2.length === 0) return null

  const row       = rows2[0]
  const breakdown = row.payload as VideoBreakdownPayload | null
  if (!breakdown) return null
  const hasV25    = breakdown.viral_formulas?.length > 0
  const hasLegacy = !!((breakdown as unknown) as Record<string, unknown>).analysis
  if (!hasV25 && !hasLegacy) return null

  const video = (row.tiktok_videos as Record<string, unknown> | null)
    ?? syntheticVideoFromSourceMeta(breakdown)
  if (!video) return null

  return { seo_slug: row.seo_slug as string | null, payload: breakdown, created_at: row.created_at, video }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanTitle(text: string): string {
  return text.replace(/#[\w一-龥＀-￯]+\s*/g, '').replace(/\s{2,}/g, ' ').trim()
}

// ── Metadata ──────────────────────────────────────────────────────────────────

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const result = await getBreakdown(slug)
  if (!result) return { title: 'Ad Strategy Breakdown | TTLike' }

  const { video, payload } = result
  const productName  = String(video.product_name ?? video.title ?? 'Viral Product')
  const cleanName    = cleanTitle(productName)
  const niche        = String(video.niche ?? 'E-Commerce')
  const views        = Number(video.views ?? 0)

  const firstFormula = payload.viral_formulas?.[0]
  const strategyName = firstFormula?.title ?? 'Viral Ad Strategy'

  // Use the canonical slug URL (not UUID) for all meta tags
  const canonicalSlug = result.seo_slug ?? slug
  const canonicalUrl  = `${SITE_URL}/viral/${canonicalSlug}`

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
      url:    canonicalUrl,
      images: video.cover_url ? [{ url: String(video.cover_url), width: 720, height: 405 }] : [],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      video.cover_url ? [String(video.cover_url)] : [],
    },
    alternates: { canonical: canonicalUrl },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ViralBreakdownPage({ params }: Props) {
  const { slug } = await params
  const result = await getBreakdown(slug)
  if (!result) notFound()

  const { payload, created_at, video } = result

  // ── UUID → slug 301 redirect (lazy backfill for legacy DB-sourced URLs) ────
  // Only applies when the slug IS a UUID and the video has a real DB row.
  if (isUuid(slug) && video.id != null) {
    let targetSlug = result.seo_slug

    // If no slug stored yet, generate one and persist it (lazy backfill)
    if (!targetSlug) {
      const dbVideoId     = String(video.id)
      const productName   = String(video.product_name ?? video.title ?? '')
      const niche         = String(video.niche ?? 'general')
      const strategyTitle = payload.viral_formulas?.[0]?.title ?? 'viral-strategy'
      targetSlug = generateViralSlug({ productName, niche, strategyTitle, videoId: dbVideoId })

      // Persist slug to DB (fire-and-forget — page still renders either way)
      const updatedD1 = await runD1(
        'UPDATE video_breakdowns SET seo_slug = ?, updated_at = CURRENT_TIMESTAMP WHERE video_id = ? AND seo_slug IS NULL',
        [targetSlug, dbVideoId],
      )

      if (!updatedD1) try {
        const service = createServiceClient()
        await service
          .from('video_breakdowns')
          .update({ seo_slug: targetSlug })
          .eq('video_id', dbVideoId)
          .is('seo_slug', null)
      } catch { /* non-fatal */ }
    }

    redirect(`/viral/${targetSlug}`)
  }

  const productName  = String(video.product_name ?? video.title ?? 'Viral Product')
  const cleanName    = cleanTitle(productName)
  const niche        = String(video.niche ?? 'E-Commerce')
  const viralScore   = Number(video.viral_score ?? 0)

  const firstFormula = payload.viral_formulas?.[0]
  const strategyName = firstFormula?.title ?? 'Viral Ad Strategy'

  const videoId       = video.id != null ? String(video.id) : null
  const coverSrc      = (video.cover_storage_url as string | null) ?? (video.cover_url as string | null) ?? null
  const canonicalSlug = result.seo_slug ?? slug

  const cloneHref = videoId
    ? `/dashboard/ai-scripts?from_video=${encodeURIComponent(videoId)}&suggested_title=${encodeURIComponent(cleanName)}&niche=${encodeURIComponent(niche)}&keywords=${encodeURIComponent(productName)}`
    : `/dashboard/ai-scripts?suggested_title=${encodeURIComponent(cleanName)}&keywords=${encodeURIComponent(productName)}`

  // ── JSON-LD structured data ─────────────────────────────────────────────────
  const jsonLd = {
    '@context':  'https://schema.org',
    '@type':     'Article',
    headline:    `${cleanName} — ${strategyName}`,
    description: 'Full TikTok ad structure breakdown: viral formulas, copy-paste scripts, visual timeline',
    image:       coverSrc ?? undefined,
    datePublished: created_at,
    author:      { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher:   { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/viral/${canonicalSlug}` },
    keywords:    `TikTok ad strategy, ${strategyName}, ${niche}, viral marketing`,
  }

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10">

        {/* Back link — only shown for DB-sourced videos */}
        {videoId ? (
          <Link href={`/products/${videoId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Product
          </Link>
        ) : (
          <Link href="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="h-4 w-4" /> Browse Products
          </Link>
        )}

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Only show niche badge when we have real data (oEmbed rows have niche=null) */}
            {video.niche != null && (
              <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700">
                {niche}
              </span>
            )}
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
          <p className="text-sm text-gray-500 mt-1 font-medium">{strategyName}</p>
          {video.author != null && (
            <p className="text-sm text-gray-400 mt-0.5">@{String(video.author)}</p>
          )}
        </div>

        {/* ── Cover + metrics ── */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 mb-6">
          {coverSrc ? (
            <div className="relative aspect-video bg-gray-100">
              <img
                src={coverSrc}
                alt={cleanName.slice(0, 80) || 'Product video cover'}
                className="w-full h-full object-cover object-center"
                onError={undefined}
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
              { icon: Eye,    label: 'Views',  value: payload.metrics?.views  ?? '—' },
              { icon: Heart,  label: 'Likes',  value: payload.metrics?.likes  ?? '—' },
              { icon: Share2, label: 'Shares', value: payload.metrics?.shares ?? '—' },
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
          <VideoAnalysis data={payload} showPremiumCta={false} />
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
