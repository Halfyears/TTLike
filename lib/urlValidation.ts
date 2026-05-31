/**
 * lib/urlValidation.ts
 *
 * Single source of truth for TikTok URL validation rules.
 * Used by both server routes and client components so rules stay aligned.
 */

/** Max length accepted for any user-supplied URL string. */
export const MAX_URL_LENGTH = 500

/** Allowed TikTok hostnames (parsed, not substring match). */
export const TIKTOK_HOST_RE = /^(www\.|m\.|vm\.|vt\.)?tiktok\.com$/i

/**
 * Returns true when the string is a plausible TikTok URL.
 * Uses URL hostname parsing — not bypassable via query-param spoofing.
 *
 * Accepts the same set as the server's ALLOWED_TIKTOK_HOSTS guard.
 */
export function isTikTokUrl(raw: string): boolean {
  if (!raw || raw.length > MAX_URL_LENGTH) return false
  if (!/^https?:\/\//i.test(raw)) return false
  try {
    const { hostname } = new URL(raw)
    return TIKTOK_HOST_RE.test(hostname)
  } catch {
    return false
  }
}

/**
 * Returns a human-readable error string, or null if the URL looks valid.
 * Intended for client-side inline error messages before submitting.
 */
export function tikTokUrlError(raw: string): string | null {
  if (!raw.trim()) return null   // empty: let required-field handler deal with it
  if (raw.length > MAX_URL_LENGTH) return 'URL is too long. Please paste a standard TikTok video URL.'
  if (!/^https?:\/\//i.test(raw)) return 'Please enter a URL starting with https://'
  try {
    const { hostname } = new URL(raw)
    if (!TIKTOK_HOST_RE.test(hostname)) return 'Only TikTok URLs are accepted (tiktok.com)'
  } catch {
    return 'Invalid URL format'
  }
  return null
}
