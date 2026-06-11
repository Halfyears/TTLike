/**
 * Shared helper: fetch live engagement stats (views/likes/shares/comments)
 * for a TikTok video from RapidAPI tiktok-scraper7.
 *
 * NOTE: the subscribed plan does NOT include /video/info (single-video lookup
 * returns 404 "Endpoint does not exist"). The only available endpoints are
 * /challenge/info, /challenge/posts, /feed/list — all keyword/feed search.
 * So we search /feed/list with a keyword derived from the video's title or
 * product name, and look for a result whose video id matches.
 *
 * Used by:
 *  - /api/studio/resolve-url (retry once for existing videos with 0 stats)
 *  - /api/admin/videos/refresh-stats (batch backfill for old 0-stat rows)
 */

export interface VideoStats {
  views:       number
  likes:       number
  shares:      number
  comments:    number
  viral_score: number
}

function viralScore(views: number, likes: number, shares: number, comments: number): number {
  if (!views) return 0
  const engagement = (likes + shares * 3 + comments * 2) / views
  const viewScore  = Math.min(50, Math.log10(Math.max(views, 1)) * 10)
  const engScore   = Math.min(50, engagement * 1000)
  return Math.round((viewScore + engScore) * 100) / 100
}

function statsFromItem(v: Record<string, unknown>): VideoStats | null {
  const stats = (v['stats'] ?? v['statistics'] ?? {}) as Record<string, unknown>
  const views    = Number(stats['playCount']    ?? v['play_count']    ?? v['playCount']    ?? 0)
  const likes    = Number(stats['diggCount']    ?? v['digg_count']    ?? v['diggCount']    ?? 0)
  const shares   = Number(stats['shareCount']   ?? v['share_count']   ?? v['shareCount']   ?? 0)
  const comments = Number(stats['commentCount'] ?? v['comment_count'] ?? v['commentCount'] ?? 0)
  if (!views && !likes && !shares && !comments) return null
  return { views, likes, shares, comments, viral_score: viralScore(views, likes, shares, comments) }
}

function itemId(v: Record<string, unknown>): string {
  return String(v['video_id'] ?? v['id'] ?? v['aweme_id'] ?? '')
}

/** Derive a short search keyword from a product name / title for /feed/list. */
export function deriveKeyword(text: string | null | undefined): string | null {
  if (!text) return null
  const cleaned = text
    .replace(/#[\wÀ-ɏḀ-ỿ一-鿿]+/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!cleaned) return null
  // Keep it short — first 4-6 words tends to work best for feed search
  return cleaned.split(' ').slice(0, 6).join(' ').slice(0, 80)
}

/**
 * Fetch fresh stats for a video by searching /feed/list for `keyword` and
 * matching the result whose id equals `tiktokId`. Returns null on any failure.
 */
export async function fetchVideoStats(tiktokId: string, keyword: string | null): Promise<VideoStats | null> {
  const result = await fetchVideoStatsDebug(tiktokId, keyword)
  return 'data' in result ? result.data : null
}

/** Same as fetchVideoStats but reports why it failed, for diagnostics. */
export async function fetchVideoStatsDebug(tiktokId: string, keyword: string | null): Promise<{ data: VideoStats } | { error: string }> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) return { error: 'RAPIDAPI_KEY not configured' }
  if (!keyword) return { error: 'No keyword (title/product_name) to search with' }

  const HEADERS = { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com' }
  const BASE = 'https://tiktok-scraper7.p.rapidapi.com'
  const endpoint = `${BASE}/feed/list?keywords=${encodeURIComponent(keyword)}&count=20&cursor=0&region=US&sort_type=0`

  try {
    const res = await fetch(endpoint, { headers: HEADERS, signal: AbortSignal.timeout(15_000) })
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      return { error: `HTTP ${res.status}${bodyText ? `: ${bodyText.slice(0, 150)}` : ''}` }
    }
    const body = await res.json() as Record<string, unknown>
    const d = (body['data'] as Record<string, unknown>) ?? {}
    const items = (d['videos'] ?? d['itemList'] ?? d['aweme_list'] ?? (Array.isArray(d) ? d : [])) as unknown[]

    for (const item of items) {
      const v = item as Record<string, unknown>
      if (itemId(v) === tiktokId) {
        const stats = statsFromItem(v)
        if (stats) return { data: stats }
        return { error: `Matched video ${tiktokId} but no stats in item` }
      }
    }
    return { error: `Video ${tiktokId} not found among ${items.length} feed/list results for "${keyword}"` }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}
