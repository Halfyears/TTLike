/**
 * POST /api/admin/pipeline/resolve-url
 *
 * Resolves a TikTok video URL to a tiktok_videos.id UUID.
 * If the video is not in the database, fetches it via RapidAPI and inserts it.
 *
 * Response (success):
 *   { ok: true, video_id, title, product_name, niche, has_timeline, scraped? }
 * Response (error):
 *   { ok: false, error }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function isAdmin(): Promise<boolean> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    try {
      const u = await prisma.user.findUnique({ where: { email: user.email! } })
      if (u?.role === 'ADMIN') return true
    } catch {}
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

function extractTikTokId(url: string): string | null {
  const match = url.match(/\/video\/(\d{10,20})/)
  return match ? match[1] : null
}

function extractUrl(field: unknown): string {
  if (!field) return ''
  if (typeof field === 'string') return field.startsWith('http') ? field : ''
  if (Array.isArray(field)) {
    for (const item of field) { const u = extractUrl(item); if (u) return u }
    return ''
  }
  if (typeof field === 'object' && field !== null) {
    const f = field as Record<string, unknown>
    const urlList = f['url_list']
    if (Array.isArray(urlList) && urlList.length) { const u = extractUrl(urlList[0]); if (u) return u }
    for (const k of ['url', 'uri', 'download_url', 'src', 'cover_url']) {
      if (typeof f[k] === 'string' && (f[k] as string).startsWith('http')) return f[k] as string
    }
  }
  return ''
}

function detectNiche(text: string): string {
  const t = text.toLowerCase()
  if (/health|fitness|workout|posture|yoga|gym/.test(t))          return 'Fitness'
  if (/beauty|makeup|skincare|glow|serum|lash/.test(t))           return 'Beauty'
  if (/kitchen|cooking|food|recipe|blender|chef/.test(t))         return 'Kitchen'
  if (/home|decor|room|house|clean|organiz/.test(t))              return 'Home'
  if (/tech|gadget|phone|device|smart|led|light/.test(t))         return 'Tech'
  if (/pet|dog|cat|animal/.test(t))                               return 'Pets'
  if (/travel|trip|vacation|luggage|pillow/.test(t))              return 'Travel'
  if (/wellness|massage|pain|sleep/.test(t))                      return 'Health'
  return 'General'
}

function viralScore(views: number, likes: number, shares: number, comments: number): number {
  if (!views) return 0
  const engagement = (likes + shares * 3 + comments * 2) / views
  const viewScore  = Math.min(50, Math.log10(Math.max(views, 1)) * 10)
  const engScore   = Math.min(50, engagement * 1000)
  return Math.round((viewScore + engScore) * 100) / 100
}

function extractProductName(title: string): string | null {
  if (!title) return null
  const base = title.split('#')[0]!.trim()
    .replace(/^(pov[:\s]+|omg[!\s]*|wait[!\s]*|ok\s+so[,\s]+|bestie[,\s]+|guys[,\s]+|i\s+(got|tried|found|bought)[,\s]+|this\s+(is|was)[,\s]+|check\s+(this\s+out|out)[,\s]+|obsessed\s+with[,\s]+|you\s+(need|have\s+to)[,\s]+|honestly[,\s]+|literally[,\s]+)/i, '')
    .replace(/[\s.,!?:;\-|•@]+$/, '')
    .trim()
  if (base.length >= 5 && base.length <= 150) return base
  const fallback = title.split('#')[0]!.trim().slice(0, 100).replace(/[.,!? ]+$/, '')
  return fallback.length >= 5 ? fallback : null
}

/** Fetch a single TikTok video via RapidAPI tiktok-scraper7 */
async function fetchFromRapidAPI(tiktokId: string, tiktokUrl: string): Promise<{
  tiktok_id:    string
  title:        string
  author:       string
  views:        number
  likes:        number
  shares:       number
  comments:     number
  viral_score:  number
  niche:        string
  product_name: string | null
  cover_url:    string | null
  video_url:    string
} | null> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://tiktok-scraper7.p.rapidapi.com/video/info?video_id=${tiktokId}`,
      {
        headers: {
          'x-rapidapi-key':  apiKey,
          'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com',
        },
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!res.ok) return null

    const body = await res.json()
    // API returns { code, data: { ... video fields ... } }
    const v = body?.data ?? body

    const author   = v?.author ?? {}
    const videoObj = v?.video  ?? {}

    const title = (v?.desc ?? v?.title ?? v?.item_title ?? '') as string
    const plays  = Number(v?.play_count    ?? v?.playCount    ?? 0)
    const likes  = Number(v?.digg_count    ?? v?.diggCount    ?? 0)
    const shares = Number(v?.share_count   ?? v?.shareCount   ?? 0)
    const cmnts  = Number(v?.comment_count ?? v?.commentCount ?? 0)
    const authorName = (author?.nickname ?? author?.unique_id ?? 'unknown') as string

    const coverUrl =
      extractUrl(v?.origin_cover)   ||
      extractUrl(v?.originCover)    ||
      extractUrl(videoObj?.origin_cover) ||
      extractUrl(videoObj?.cover)   ||
      extractUrl(v?.cover)          ||
      null

    return {
      tiktok_id:    tiktokId,
      title:        title.slice(0, 500) || `TikTok video ${tiktokId}`,
      author:       authorName,
      views:        plays,
      likes,
      shares,
      comments:     cmnts,
      viral_score:  viralScore(plays, likes, shares, cmnts),
      niche:        detectNiche(title),
      product_name: extractProductName(title),
      cover_url:    coverUrl,
      video_url:    tiktokUrl,
    }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { tiktok_url?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { tiktok_url } = body
  if (!tiktok_url || typeof tiktok_url !== 'string') {
    return NextResponse.json({ ok: false, error: 'tiktok_url is required' }, { status: 400 })
  }

  const rawUrl  = tiktok_url.trim()
  const tiktokId = extractTikTokId(rawUrl)
  if (!tiktokId) {
    return NextResponse.json({
      ok: false,
      error: 'Could not parse TikTok video ID from URL. Use format: https://www.tiktok.com/@user/video/ID',
    }, { status: 400 })
  }

  const service = createServiceClient()

  // ── 1. Check DB first ─────────────────────────────────────────────────────
  const { data: existing } = await service
    .from('tiktok_videos')
    .select('id, title, product_name, niche')
    .eq('tiktok_id', tiktokId)
    .maybeSingle()

  type VideoRow = { id: string; title: string | null; product_name: string | null; niche: string | null }
  let videoRow = existing as VideoRow | null
  let scraped  = false

  // ── 2. Not in DB → fetch from RapidAPI and insert ─────────────────────────
  if (!videoRow) {
    const fetched = await fetchFromRapidAPI(tiktokId, rawUrl)

    if (!fetched) {
      return NextResponse.json({
        ok:    false,
        error: `Video not found in database and could not be fetched via API (TikTok ID: ${tiktokId}). Check your RAPIDAPI_KEY or try again.`,
      }, { status: 404 })
    }

    const { data: inserted, error: insertErr } = await service
      .from('tiktok_videos')
      .insert(fetched)
      .select('id, title, product_name, niche')
      .single()

    if (insertErr || !inserted) {
      // Could be a duplicate race — try select again
      const { data: retry } = await service
        .from('tiktok_videos')
        .select('id, title, product_name, niche')
        .eq('tiktok_id', tiktokId)
        .maybeSingle()

      if (!retry) {
        return NextResponse.json({
          ok:    false,
          error: `Failed to save video: ${insertErr?.message ?? 'unknown'}`,
        }, { status: 500 })
      }
      videoRow = retry as VideoRow
    } else {
      videoRow = inserted as VideoRow
      scraped  = true
    }
  }

  // ── 3. Check breakdown timeline ───────────────────────────────────────────
  const { data: breakdown } = await service
    .from('video_breakdowns')
    .select('id, payload')
    .eq('video_id', videoRow!.id)
    .maybeSingle()

  const hasTimeline = !!(breakdown?.payload?.visual_timeline?.length)

  return NextResponse.json({
    ok:           true,
    video_id:     videoRow!.id,
    title:        videoRow!.title,
    product_name: videoRow!.product_name,
    niche:        videoRow!.niche,
    has_timeline: hasTimeline,
    scraped,
  })
}
