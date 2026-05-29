/**
 * POST /api/studio/resolve-url
 *
 * User-facing: resolves a TikTok URL to video_id.
 * Requires Supabase Auth (any logged-in user, not admin-only).
 * Logic mirrors /api/admin/pipeline/resolve-url.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function getUser() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    return user
  } catch { return null }
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
  if (/health|fitness|workout|posture|yoga|gym/.test(t))     return 'Fitness'
  if (/beauty|makeup|skincare|glow|serum|lash/.test(t))      return 'Beauty'
  if (/kitchen|cooking|food|recipe|blender|chef/.test(t))    return 'Kitchen'
  if (/home|decor|room|house|clean|organiz/.test(t))         return 'Home'
  if (/tech|gadget|phone|device|smart|led|light/.test(t))    return 'Tech'
  if (/pet|dog|cat|animal/.test(t))                          return 'Pets'
  if (/travel|trip|vacation|luggage|pillow/.test(t))         return 'Travel'
  if (/wellness|massage|pain|sleep/.test(t))                 return 'Health'
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

type FetchedVideo = {
  tiktok_id: string; title: string; author: string
  views: number; likes: number; shares: number; comments: number
  viral_score: number; niche: string; product_name: string | null
  cover_url: string | null; video_url: string
}

function parseVideoData(body: unknown, tiktokId: string, tiktokUrl: string): FetchedVideo | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const v = (
    (b['data'] && typeof b['data'] === 'object' && !Array.isArray(b['data']) ? b['data'] : null) ??
    (b['itemInfo'] && typeof b['itemInfo'] === 'object' ? b['itemInfo'] : null) ??
    b
  ) as Record<string, unknown>
  const author   = (v['author']                   ?? {}) as Record<string, unknown>
  const videoObj = (v['video']                    ?? {}) as Record<string, unknown>
  const stats    = (v['stats'] ?? v['statistics'] ?? {}) as Record<string, unknown>
  const title    = String(v['desc'] ?? v['title'] ?? v['item_title'] ?? v['text'] ?? '').slice(0, 500)
  if (!title && !v['id'] && !v['aweme_id']) return null
  const plays  = Number(stats['playCount']    ?? v['play_count']    ?? v['playCount']    ?? 0)
  const likes  = Number(stats['diggCount']    ?? v['digg_count']    ?? v['diggCount']    ?? 0)
  const shares = Number(stats['shareCount']   ?? v['share_count']   ?? v['shareCount']   ?? 0)
  const cmnts  = Number(stats['commentCount'] ?? v['comment_count'] ?? v['commentCount'] ?? 0)
  const authorName = String(author['nickname'] ?? author['unique_id'] ?? author['uniqueId'] ?? 'unknown')
  const coverUrl =
    extractUrl(v['origin_cover'])        ||
    extractUrl(v['originCover'])         ||
    extractUrl(videoObj['origin_cover']) ||
    extractUrl(videoObj['cover'])        ||
    extractUrl(v['cover'])               ||
    null
  return {
    tiktok_id: tiktokId, title: title || `TikTok video ${tiktokId}`,
    author: authorName, views: plays, likes, shares, comments: cmnts,
    viral_score: viralScore(plays, likes, shares, cmnts),
    niche: detectNiche(title), product_name: extractProductName(title),
    cover_url: coverUrl, video_url: tiktokUrl,
  }
}

async function fetchFromRapidAPI(tiktokId: string, tiktokUrl: string): Promise<{ data: FetchedVideo } | { error: string }> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) return { error: 'RAPIDAPI_KEY not configured' }
  const HEADERS = { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com' }
  const BASE = 'https://tiktok-scraper7.p.rapidapi.com'
  const endpoints = [
    `${BASE}/video/info?url=${encodeURIComponent(tiktokUrl)}`,
    `${BASE}/video/info?video_id=${tiktokId}`,
  ]
  let lastStatus = 0, lastErr = ''
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers: HEADERS, signal: AbortSignal.timeout(15_000) })
      lastStatus = res.status
      if (!res.ok) { lastErr = `HTTP ${res.status}`; continue }
      const body = await res.json()
      const parsed = parseVideoData(body, tiktokId, tiktokUrl)
      if (parsed) return { data: parsed }
      lastErr = 'Unexpected API response structure'
    } catch (e) { lastErr = e instanceof Error ? e.message : String(e) }
  }
  const hint =
    lastStatus === 403 ? ' — API key invalid or quota exceeded' :
    lastStatus === 429 ? ' — Rate limit, try again shortly' :
    lastStatus === 404 ? ' — Video may be private or deleted' : ''
  return { error: `Could not fetch video (${lastStatus || 'timeout'})${hint}` }
}

async function fetchFromOEmbed(tiktokId: string, tiktokUrl: string): Promise<{ data: FetchedVideo } | { error: string }> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return { error: `oEmbed HTTP ${res.status}` }
    const body = await res.json() as Record<string, unknown>
    const title = String(body['title'] ?? '').slice(0, 500)
    return {
      data: {
        tiktok_id: tiktokId, title: title || `TikTok video ${tiktokId}`,
        author: String(body['author_name'] ?? 'unknown'),
        views: 0, likes: 0, shares: 0, comments: 0, viral_score: 0,
        niche: detectNiche(title), product_name: extractProductName(title),
        cover_url: String(body['thumbnail_url'] ?? '') || null,
        video_url: tiktokUrl,
      },
    }
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) } }
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Please sign in to use Studio' }, { status: 401 })

  let body: { tiktok_url?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { tiktok_url } = body
  if (!tiktok_url || typeof tiktok_url !== 'string') {
    return NextResponse.json({ ok: false, error: 'tiktok_url is required' }, { status: 400 })
  }

  const rawUrl   = tiktok_url.trim().split('?')[0] ?? tiktok_url.trim()
  const tiktokId = extractTikTokId(rawUrl)
  if (!tiktokId) {
    return NextResponse.json({ ok: false, error: 'Could not parse TikTok video ID. Use format: https://www.tiktok.com/@user/video/ID' }, { status: 400 })
  }

  const service = createServiceClient()

  type VideoRow = { id: string; title: string | null; product_name: string | null; niche: string | null }
  const { data: existing } = await service
    .from('tiktok_videos').select('id, title, product_name, niche').eq('tiktok_id', tiktokId).maybeSingle()

  let videoRow = existing as VideoRow | null

  if (!videoRow) {
    let result = await fetchFromRapidAPI(tiktokId, rawUrl)
    if ('error' in result) result = await fetchFromOEmbed(tiktokId, rawUrl)
    if ('error' in result) {
      return NextResponse.json({ ok: false, error: `Video not found. It may be private or deleted. (${result.error})` }, { status: 404 })
    }
    const { data: inserted, error: insertErr } = await service
      .from('tiktok_videos').insert(result.data).select('id, title, product_name, niche').single()
    if (insertErr || !inserted) {
      const { data: retry } = await service
        .from('tiktok_videos').select('id, title, product_name, niche').eq('tiktok_id', tiktokId).maybeSingle()
      if (!retry) return NextResponse.json({ ok: false, error: `Failed to save video: ${insertErr?.message ?? 'unknown'}` }, { status: 500 })
      videoRow = retry as VideoRow
    } else {
      videoRow = inserted as VideoRow
    }
  }

  return NextResponse.json({
    ok:           true,
    video_id:     videoRow!.id,
    title:        videoRow!.title,
    product_name: videoRow!.product_name,
    niche:        videoRow!.niche,
  })
}
