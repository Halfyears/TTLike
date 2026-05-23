/**
 * payloadCompiler.ts — Compact LLM payload compiler
 *
 * Assembles video metadata into a single, token-optimized text payload.
 * Completely bypasses multimodal processing — pure text extraction from
 * structured metadata acts as a frame-sample equivalent at near-zero cost.
 *
 * Inspired by frame-sampling philosophy:
 * instead of sampling video frames, we sample engagement signal windows
 * from the metric curve (like rate, share rate, combined engagement) to
 * reconstruct the video's emotional arc in text form.
 *
 * Signal window interpretation:
 *   Like rate  → retention signal  (audience kept watching to like)
 *   Share rate → virality signal   (audience trusted enough to share)
 *   Eng rate   → conversion signal (combined buyer intent indicator)
 */

export interface VideoSignals {
  title:        string
  product_name: string | null
  niche:        string | null
  views:        number
  likes:        number
  shares:       number
  author:       string
  comments?:    string[]  // pre-filtered buyer signals (≤ 15)
}

interface SignalWindow {
  label:  string
  value:  string
  signal: string  // behavioural interpretation for LLM
}

// ── Engagement window derivation ──────────────────────────────────────────────

function computeSignalWindows(s: VideoSignals): SignalWindow[] {
  const { views, likes, shares } = s
  if (!views) return []

  const lr = likes  / views
  const sr = shares / views
  const er = (likes + shares) / views

  return [
    {
      label:  'Like rate',
      value:  `${(lr * 100).toFixed(2)}%`,
      signal: lr > 0.08 ? 'high-retention' : lr > 0.04 ? 'mid-retention' : 'low-retention',
    },
    {
      label:  'Share rate',
      value:  `${(sr * 100).toFixed(2)}%`,
      signal: sr > 0.01 ? 'viral-spread' : 'organic-only',
    },
    {
      label:  'Engagement',
      value:  `${(er * 100).toFixed(2)}%`,
      signal: er > 0.05 ? 'strong-buyer-signal' : 'weak-buyer-signal',
    },
  ]
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compile all signals into a single dense text payload for the LLM.
 * Structure mirrors frame-sampling output: ordered, labelled, compact.
 *
 * @param signals         Video metadata + optional filtered comments
 * @param productReminder Reminder string to anchor your_version to product
 */
export function compileVideoPayload(
  signals:         VideoSignals,
  productReminder: string,
): string {
  const productLabel = signals.product_name ?? signals.title
  const nicheLabel   = signals.niche ?? 'E-Commerce'
  const windows      = computeSignalWindows(signals)

  const lines: string[] = [
    `Video title: ${signals.title}`,
    `Product: ${productLabel}`,
    `Niche: ${nicheLabel}`,
    `Author: @${signals.author}`,
    `Raw metrics: ${signals.views.toLocaleString()} views / ${signals.likes.toLocaleString()} likes / ${signals.shares.toLocaleString()} shares`,
    // Derived signal windows (synthetic frame samples from engagement curve)
    ...windows.map(w => `${w.label}: ${w.value} [${w.signal}]`),
    ``,
    productReminder,
    // Optional buyer signals injected last (most specific context)
    // Header must match system prompt OPTIONAL BUYER SIGNALS instruction exactly
    ...(signals.comments?.length
      ? [
          ``,
          `BUYER SIGNALS (${signals.comments.length} high-intent comments — use to sharpen your_version language):`,
          ...signals.comments.map(c => `• ${c}`),
        ]
      : []),
  ]

  return lines.join('\n')
}
