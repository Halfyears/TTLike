/**
 * lib/tiktokImg.ts — TikTok CDN URL utilities
 *
 * TikTok CDN signed URLs (p*-common-sign.tiktokcdn*.com) expire after ~7 days.
 * These helpers prevent browsers from even attempting to load expired URLs
 * (which would log 403 errors in the console), and route valid URLs through
 * our Supabase Storage cache when available.
 */

/**
 * Returns true if a TikTok CDN URL has passed its x-expires timestamp.
 * Non-TikTok URLs always return false (treated as never-expiring).
 */
export function isTikTokUrlExpired(url: string | null | undefined): boolean {
  if (!url) return false
  // Only inspect signed TikTok CDN URLs
  if (!url.includes('tiktokcdn')) return false
  try {
    const expires = new URL(url).searchParams.get('x-expires')
    if (!expires) return false
    return parseInt(expires, 10) * 1000 < Date.now()
  } catch {
    return false
  }
}

/**
 * Returns the best available cover URL for a video, in priority order:
 *   1. cover_storage_url  — permanent Supabase Storage URL (never expires)
 *   2. cover_url          — original TikTok CDN URL (only if not expired)
 *   3. null               — no valid image available
 */
export function bestCoverUrl(
  coverStorageUrl: string | null | undefined,
  coverUrl:        string | null | undefined,
): string | null {
  if (coverStorageUrl) return coverStorageUrl
  if (coverUrl && !isTikTokUrlExpired(coverUrl)) return coverUrl
  return null
}
