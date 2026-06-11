/**
 * Shared helper: fetch live engagement stats (views/likes/shares/comments)
 * for a TikTok video from RapidAPI tiktok-scraper7.
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

function extractStats(body: unknown): VideoStats | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const v = (
    (b['data'] && typeof b['data'] === 'object' && !Array.isArray(b['data']) ? b['data'] : null) ??
    (b['itemInfo'] && typeof b['itemInfo'] === 'object' ? b['itemInfo'] : null) ??
    b
  ) as Record<string, unknown>
  const stats = (v['stats'] ?? v['statistics'] ?? {}) as Record<string, unknown>

  const views    = Number(stats['playCount']    ?? v['play_count']    ?? v['playCount']    ?? 0)
  const likes    = Number(stats['diggCount']    ?? v['digg_count']    ?? v['diggCount']    ?? 0)
  const shares   = Number(stats['shareCount']   ?? v['share_count']   ?? v['shareCount']   ?? 0)
  const comments = Number(stats['commentCount'] ?? v['comment_count'] ?? v['commentCount'] ?? 0)

  if (!views && !likes && !shares && !comments) return null

  return { views, likes, shares, comments, viral_score: viralScore(views, likes, shares, comments) }
}

/**
 * Fetch fresh stats for a video. Returns null if RapidAPI is unavailable,
 * the video can't be found, or the response contains no usable stats.
 */
export async function fetchVideoStats(tiktokId: string, tiktokUrl: string): Promise<VideoStats | null> {
  const result = await fetchVideoStatsDebug(tiktokId, tiktokUrl)
  return 'data' in result ? result.data : null
}

/** Same as fetchVideoStats but reports why it failed, for diagnostics. */
export async function fetchVideoStatsDebug(tiktokId: string, tiktokUrl: string): Promise<{ data: VideoStats } | { error: string }> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) return { error: 'RAPIDAPI_KEY not configured' }

  const HEADERS = { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com' }
  const BASE = 'https://tiktok-scraper7.p.rapidapi.com'
  const endpoints = [
    `${BASE}/video/info?url=${encodeURIComponent(tiktokUrl)}`,
    `${BASE}/video/info?video_id=${tiktokId}`,
  ]

  let lastErr = 'unknown'
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers: HEADERS, signal: AbortSignal.timeout(15_000) })
      if (!res.ok) { lastErr = `HTTP ${res.status} from ${endpoint}`; continue }
      const body = await res.json()
      const stats = extractStats(body)
      if (stats) return { data: stats }
      lastErr = `No stats in response from ${endpoint}: ${JSON.stringify(body).slice(0, 200)}`
    } catch (e) { lastErr = `${e instanceof Error ? e.message : String(e)} (${endpoint})` }
  }
  return { error: lastErr }
}
