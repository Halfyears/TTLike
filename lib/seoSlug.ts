/**
 * lib/seoSlug.ts — SEO-friendly URL slug generator for /viral/ pages
 *
 * Generates human-readable, crawlable URLs from product metadata:
 *   /viral/posture-corrector-health-emotional-hook-strategy-a1b2c3d4
 *
 * The 8-char UUID suffix guarantees global uniqueness without a DB UNIQUE check.
 */

/**
 * Convert any string to lowercase ASCII kebab-case.
 * Non-ASCII characters (e.g. Chinese) are silently dropped.
 */
export function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, '')   // strip non-ASCII (Chinese, emoji, etc.)
    .replace(/[^a-z0-9\s-]/g, '')   // keep letters, digits, spaces, hyphens
    .trim()
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse runs of hyphens
    .replace(/^-|-$/g, '')           // trim leading / trailing hyphens
}

/**
 * Build the canonical SEO slug for a /viral/ page.
 *
 * Format: {product}-{niche}-{strategy}-{8-char-uuid-prefix}
 * Example: posture-corrector-health-emotional-hook-strategy-a1b2c3d4
 *
 * @param productName   Cleaned product name (no hashtags)
 * @param niche         Product niche (e.g. "Health", "Beauty")
 * @param strategyTitle First viral formula title from the breakdown
 * @param videoId       tiktok_videos.id UUID — first 8 hex chars used as suffix
 */
export function generateViralSlug(params: {
  productName:   string
  niche:         string
  strategyTitle: string
  videoId:       string
}): string {
  const { productName, niche, strategyTitle, videoId } = params

  const productSlug  = toKebab(productName).slice(0, 40)
  const nicheSlug    = toKebab(niche).slice(0, 20)
  const strategySlug = toKebab(strategyTitle).slice(0, 35)

  // 8 lowercase hex chars from the UUID (strip hyphens) for uniqueness
  const idSuffix = videoId.replace(/-/g, '').slice(0, 8)

  const parts = [productSlug, nicheSlug, strategySlug].filter(Boolean)
  const base  = parts.join('-').slice(0, 75) || 'viral-product'

  return `${base}-${idSuffix}`
}

/** Returns true if a string looks like a UUID (v4 or similar). */
export function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
