/**
 * sentimentFilter.ts — Buyer-signal comment filter
 *
 * Keyword-dictionary scoring applied BEFORE LLM payload compilation.
 * Enforces absolute minimum token consumption: raw comments (potentially
 * hundreds) are reduced to ≤ maxCount high-signal strings before touching
 * the Gemini context window.
 *
 * Architecture: pure functions, zero side-effects, no external deps.
 */

// ── Buyer-intent keyword dictionary ──────────────────────────────────────────
// Targets comments that signal purchase consideration, product experience,
// or conversion-relevant feedback. Organised by intent cluster.
const BUYER_INTENT: readonly string[] = [
  // Purchase intent
  'link', 'where', 'buy', 'order', 'purchase', 'how to get', 'get this',
  // Price sensitivity
  'price', 'cost', 'how much', 'worth', 'cheap', 'expensive', 'discount',
  // Post-purchase experience
  'bought', 'ordered', 'received', 'arrived', 'tried this', 'using this',
  'have this', 'mine came', 'already have',
  // Quality & authenticity
  'works', 'actually works', 'legit', 'real', 'fake', 'scam', 'quality',
  // Positive conversion signals
  'love this', 'amazing', 'game changer', 'must have', 'worth it',
  'recommend', 'obsessed',
  // Negative / objection signals (equally valuable for insight)
  'broke', 'disappointed', 'returned', 'refund', 'waste', 'doesnt work',
  "doesn't work", 'stopped working',
  // Comparison & consideration
  'better than', 'vs', 'compared', 'similar', 'dupe', 'alternative',
]

// ── Core filter function ──────────────────────────────────────────────────────

/**
 * Filter raw comment strings to buyer-signal-dense entries.
 *
 * Scoring: each BUYER_INTENT keyword match increments the score by 1.
 * Returns the top-N comments by descending score.
 * Token-safe: always returns ≤ maxCount short strings.
 *
 * @param comments  Raw comment strings from any source
 * @param maxCount  Maximum comments to return (default 15)
 */
export function filterHighValueComments(
  comments: string[],
  maxCount = 15,
): string[] {
  if (!comments?.length) return []

  return comments
    // Quality gates: reject sub-word noise and essay-length outliers
    .filter(c => typeof c === 'string' && c.length >= 6 && c.length <= 180)
    .map(c => {
      const lower = c.toLowerCase()
      const score = BUYER_INTENT.reduce(
        (acc, kw) => acc + (lower.includes(kw) ? 1 : 0),
        0,
      )
      return { c, score }
    })
    .filter(({ score }) => score > 0)        // must match at least one keyword
    .sort((a, b) => b.score - a.score)       // highest signal first
    .slice(0, maxCount)
    .map(({ c }) => c.trim())
}

// ── Token budget estimator (utility) ─────────────────────────────────────────

/**
 * Rough token count for a comment array (4 chars ≈ 1 token).
 * Use to assert the filtered payload stays under a budget.
 */
export function estimateTokens(comments: string[]): number {
  return Math.ceil(comments.join(' ').length / 4)
}
