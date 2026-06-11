/**
 * POST /api/admin/run-scraper
 *
 * Runs the TikTok scraper inline (no GitHub Actions required).
 * Calls RapidAPI tiktok-scraper7 directly from Vercel, upserts results
 * to tiktok_videos, caches cover images to Supabase Storage, and writes
 * a scraper_logs entry — identical behaviour to the Python script.
 *
 * Required env: RAPIDAPI_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Auth: admin session (same isAdmin() pattern across all admin routes)
 *
 * Returns: { success, fetched, upserted, covers_cached, duration_ms, errors[] }
 */

import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { prisma }            from '@/lib/prisma'

// ── Auth ──────────────────────────────────────────────────────────────────────
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

// ── Config ────────────────────────────────────────────────────────────────────
const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY ?? ''
const RAPIDAPI_HOST = 'tiktok-scraper7.p.rapidapi.com'
const BASE_URL      = `https://${RAPIDAPI_HOST}`
const COVERS_BUCKET = 'covers'
const MAX_AGE_DAYS  = 120
const PER_HASHTAG   = 20

const HASHTAGS = [
  'tiktokfinds',
  'tiktokshop',
  'tiktokmademebuyit',
  'amazonfinds',
  'viralproducts',
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function viralScore(views: number, likes: number, shares: number, comments: number): number {
  if (views === 0) return 0
  const engagement = (likes + shares * 3 + comments * 2) / views
  const viewScore  = Math.min(50, Math.log10(Math.max(views, 1)) * 10)
  const engScore   = Math.min(50, engagement * 1000)
  return Math.round((viewScore + engScore) * 100) / 100
}

function detectNiche(text: string): string {
  const t = text.toLowerCase()
  if (/health|fitness|workout|posture|yoga|gym/.test(t))       return 'Fitness'
  if (/beauty|makeup|skincare|glow|serum|lash/.test(t))        return 'Beauty'
  if (/kitchen|cooking|food|recipe|blender|chef/.test(t))      return 'Kitchen'
  if (/\bhome\b|decor|room|house|clean|organiz/.test(t))       return 'Home'
  if (/tech|gadget|phone|device|smart|led|light/.test(t))      return 'Tech'
  if (/\bpet\b|\bdog\b|\bcat\b|animal/.test(t))                return 'Pets'
  if (/travel|trip|vacation|luggage/.test(t))                  return 'Travel'
  if (/wellness|massage|pain|sleep/.test(t))                   return 'Health'
  return 'General'
}

function extractUrl(field: unknown): string {
  if (!field) return ''
  if (typeof field === 'string') return field.startsWith('http') ? field : ''
  if (Array.isArray(field)) {
    for (const item of field) { const u = extractUrl(item); if (u) return u }
    return ''
  }
  if (typeof field === 'object' && field !== null) {
    const obj = field as Record<string, unknown>
    const list = obj['url_list']
    if (Array.isArray(list) && list.length > 0) { const u = extractUrl(list[0]); if (u) return u }
    for (const key of ['url', 'uri', 'download_url', 'src', 'cover_url']) {
      const val = obj[key]
      if (typeof val === 'string' && val.startsWith('http')) return val
    }
  }
  return ''
}

function extractProductName(title: string): string | null {
  if (!title) return null
  const base = title.split('#')[0]
    .replace(/^(pov[:\s]+|omg[!\s]*|wait[!\s]*|ok\s+so[,\s]+|bestie[,\s]+|guys[,\s]+|i\s+(got|tried|found|bought|tested|ordered|used)[,\s]+|this\s+(is|was)[,\s]+|check\s+(this\s+out|out)[,\s]+|obsessed\s+with[,\s]+|you\s+(need|have\s+to)[,\s]+|honestly[,\s]+|literally[,\s]+|not\s+me[,\s]+)/i, '')
    .replace(/[\s.,!?:;\-|•@]+$/, '')
    .trim()
  if (base.length >= 5 && base.length <= 150) return base.slice(0, 150)
  const fallback = title.split('#')[0].trim().slice(0, 100).replace(/[.,!? ]+$/, '')
  return fallback.length >= 5 ? fallback : null
}

// ── RapidAPI fetch ────────────────────────────────────────────────────────────
type VideoRow = {
  tiktok_id:        string
  title:            string
  author:           string
  views:            number
  likes:            number
  shares:           number
  comments:         number
  viral_score:      number
  video_url:        string
  cover_url:        string | null
  author_avatar_url: string | null
  niche:            string
  product_name:     string | null
  published_at:     string | null
}

async function apiGet(path: string, params: Record<string, string | number>): Promise<Record<string, unknown>> {
  const qs  = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  const res = await fetch(`${BASE_URL}/${path}?${qs}`, {
    headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`RapidAPI ${path} → HTTP ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

async function fetchHashtag(tag: string, count: number, errors: string[]): Promise<VideoRow[]> {
  const cutoff = Math.floor(Date.now() / 1000) - MAX_AGE_DAYS * 86_400

  // Try challenge lookup first
  let rawVideos: unknown[] = []
  try {
    const infoBody = await apiGet('challenge/info', { challenge_name: tag })
    const data  = (infoBody['data'] as Record<string, unknown>) ?? {}
    let ch: Record<string, unknown> = (data['challengeInfo'] ?? data['challenge'] ?? {}) as Record<string, unknown>
    if (ch['challenge']) ch = ch['challenge'] as Record<string, unknown>
    const cid = ch['id'] ?? ch['challengeId'] ?? data['id'] ?? infoBody['challenge_id']

    if (cid) {
      const postsBody = await apiGet('challenge/posts', { challenge_id: String(cid), count, cursor: 0, sort_type: 0 })
      const d = (postsBody['data'] as Record<string, unknown>) ?? {}
      rawVideos = (d['videos'] ?? d['itemList'] ?? d['aweme_list'] ?? []) as unknown[]
    } else {
      errors.push(`#${tag}: challenge/info returned no challenge id`)
    }
  } catch (e) {
    errors.push(`#${tag} challenge/info: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Fallback: keyword feed search
  if (rawVideos.length === 0) {
    try {
      const feedBody = await apiGet('feed/list', { keywords: tag, count, cursor: 0, region: 'US', sort_type: 0 })
      const d = (feedBody['data'] as Record<string, unknown>) ?? {}
      rawVideos = (d['videos'] ?? d['itemList'] ?? d['aweme_list'] ?? (Array.isArray(d) ? d : [])) as unknown[]
      if (rawVideos.length === 0) errors.push(`#${tag} feed/list: 0 results`)
    } catch (e) {
      errors.push(`#${tag} feed/list: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const videos: VideoRow[] = []
  for (const v of rawVideos) {
    try {
      const vr = v as Record<string, unknown>
      const author = (vr['author'] as Record<string, unknown>) ?? {}
      const handle = `@${author['unique_id'] ?? author['uniqueId'] ?? ''}`
      const name   = (author['nickname'] as string) ?? handle

      const plays    = Number(vr['play_count']    ?? vr['playCount']    ?? 0)
      const likes    = Number(vr['digg_count']    ?? vr['diggCount']    ?? 0)
      const shares   = Number(vr['share_count']   ?? vr['shareCount']   ?? 0)
      const comments = Number(vr['comment_count'] ?? vr['commentCount'] ?? 0)

      const title    = String(vr['desc'] ?? vr['title'] ?? vr['item_title'] ?? vr['itemTitle'] ?? '')
      const videoId  = String(vr['video_id'] ?? vr['id'] ?? vr['aweme_id'] ?? '')
      if (!videoId) continue

      const createTime = Number(vr['createTime'] ?? vr['create_time'] ?? vr['createtime'] ?? 0)
      if (createTime && createTime < cutoff) continue

      const videoObj = (vr['video'] as Record<string, unknown>) ?? {}
      const cover    = (
        extractUrl(vr['origin_cover'])            ||
        extractUrl(vr['originCover'])             ||
        extractUrl(videoObj['origin_cover'])      ||
        extractUrl(videoObj['cover'])             ||
        extractUrl(vr['cover'])                   ||
        extractUrl(vr['cover_url'])               ||
        extractUrl(videoObj['dynamic_cover'])     ||
        ''
      )

      const avatar = (
        extractUrl(author['avatarLarger']) ||
        extractUrl(author['avatarMedium']) ||
        extractUrl(author['avatarThumb'])  ||
        extractUrl(author['avatar'])       ||
        ''
      )

      let publishedAt: string | null = null
      if (createTime) {
        try { publishedAt = new Date(createTime * 1000).toISOString() } catch { /* skip */ }
      }

      videos.push({
        tiktok_id:        videoId,
        title:            title.slice(0, 500),
        author:           name,
        views:            plays,
        likes,
        shares,
        comments,
        viral_score:      viralScore(plays, likes, shares, comments),
        video_url:        `https://www.tiktok.com/@${author['unique_id'] ?? ''}/video/${videoId}`,
        cover_url:        cover || null,
        author_avatar_url: avatar || null,
        niche:            detectNiche(title),
        product_name:     extractProductName(title),
        published_at:     publishedAt,
      })
    } catch { /* skip malformed video */ }
  }
  return videos
}

// ── Cover caching ─────────────────────────────────────────────────────────────
async function cacheCover(
  service: ReturnType<typeof createServiceClient>,
  dbId: string,
  coverUrl: string,
  supabaseUrl: string,
): Promise<boolean> {
  try {
    const imgRes = await fetch(coverUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!imgRes.ok) return false
    const buf         = await imgRes.arrayBuffer()
    const contentType = imgRes.headers.get('content-type') ?? 'image/webp'
    const ext         = contentType.includes('jpeg') ? 'jpg' : contentType.includes('png') ? 'png' : 'webp'
    const storagePath = `${dbId}.${ext}`

    const { error } = await service.storage.from(COVERS_BUCKET).upload(storagePath, buf, {
      contentType,
      cacheControl: '31536000',
      upsert:       true,
    })
    if (error) return false

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${COVERS_BUCKET}/${storagePath}`
    await service.from('tiktok_videos').update({ cover_storage_url: publicUrl }).eq('id', dbId)
    return true
  } catch { return false }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const maxDuration = 60   // Vercel Pro: up to 300s; Hobby: 60s

export async function POST() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!RAPIDAPI_KEY) {
    return NextResponse.json(
      { error: 'RAPIDAPI_KEY not configured in Vercel environment variables.' },
      { status: 503 }
    )
  }

  const startMs  = Date.now()
  const service  = createServiceClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const errors:  string[] = []
  const allVideos = new Map<string, VideoRow>()

  // ── 1. Fetch from all hashtags ─────────────────────────────────────────────
  for (const tag of HASHTAGS) {
    try {
      const videos = await fetchHashtag(tag, PER_HASHTAG, errors)
      for (const v of videos) allVideos.set(v.tiktok_id, v)
    } catch (e) {
      errors.push(`#${tag}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const unique = [...allVideos.values()]

  if (unique.length === 0) {
    const msg = 'No videos fetched — check RAPIDAPI_KEY quota and hashtag availability'
    await service.from('scraper_logs').insert({
      status: 'error', message: msg,
      videos_fetched: 0, videos_updated: 0,
      error_details: errors.join('; ') || msg,
    })
    return NextResponse.json({ success: false, error: msg, fetched: 0, upserted: 0, covers_cached: 0, errors, duration_ms: Date.now() - startMs })
  }

  // ── 2. Upsert to tiktok_videos ─────────────────────────────────────────────
  let upserted = 0
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (service.from('tiktok_videos') as any).upsert(unique, { onConflict: 'tiktok_id' })
    upserted = result.data?.length ?? unique.length
  } catch (e) {
    errors.push(`Upsert failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── 3. Cache cover images for new videos ──────────────────────────────────
  let coversCached = 0
  try {
    const tiktokIds = unique.filter(v => v.cover_url).map(v => v.tiktok_id)
    if (tiktokIds.length > 0) {
      const { data: rows } = await service
        .from('tiktok_videos')
        .select('id, cover_url')
        .in('tiktok_id', tiktokIds)
        .is('cover_storage_url', null)

      for (const row of (rows ?? []) as Array<{ id: string; cover_url: string | null }>) {
        if (!row.cover_url) continue
        const ok = await cacheCover(service, row.id, row.cover_url, supabaseUrl)
        if (ok) coversCached++
      }
    }
  } catch (e) {
    errors.push(`Cover cache: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── 4. Write scraper log ───────────────────────────────────────────────────
  const durationMs = Date.now() - startMs
  const msg = `Fetched ${unique.length} videos, upserted ${upserted}, covers cached ${coversCached} (${Math.round(durationMs / 1000)}s)`
  await service.from('scraper_logs').insert({
    status:         errors.length === unique.length ? 'error' : 'success',
    message:        msg,
    videos_fetched: unique.length,
    videos_updated: upserted,
    error_details:  errors.length > 0 ? errors.join('; ') : null,
  })

  return NextResponse.json({ success: true, fetched: unique.length, upserted, covers_cached: coversCached, errors, duration_ms: durationMs })
}
