/**
 * social-proof.ts
 *
 * Deterministic "scripts generated" count per product.
 * Uses video ID as a seed so the same product always returns the same number —
 * consistent across SSR and client renders without any DB column.
 *
 * Range: 8–180. Weighted by viral_score (higher = more scripts).
 */

export function syntheticScriptCount(
  videoId: string,
  viralScore?: number | null,
): number {
  // Derive a stable seed from the first 8 hex chars of the UUID (ignore dashes)
  const hex  = videoId.replace(/-/g, '').slice(0, 8)
  const seed = parseInt(hex, 16) || 12345

  // Base: 8–47 from seed
  const base = 8 + (seed % 40)

  // Boost: 0–80 proportional to viral score (default 50)
  const score = Math.min(100, Math.max(0, viralScore ?? 50))
  const boost = Math.floor(score * 0.8)

  // Small jitter from next 4 hex chars so nearby products differ
  const jitter = parseInt(videoId.replace(/-/g, '').slice(8, 12), 16) % 15 || 0

  return Math.min(180, base + boost + jitter)
}

/**
 * Returns a human-readable label, e.g. "47 creators scripted this"
 */
export function scriptCountLabel(count: number): string {
  if (count >= 100) return `${Math.floor(count / 10) * 10}+ creators scripted this`
  return `${count} creators scripted this`
}
