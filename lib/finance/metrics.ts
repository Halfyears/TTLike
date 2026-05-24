/**
 * lib/finance/metrics.ts — Finance calculation utilities
 *
 * Token cost model (Gemini 2.5 Flash, as of 2026):
 *   Input:  $0.075 / 1M tokens
 *   Output: $0.30  / 1M tokens
 *   Per analysis call: ~3000 input + 1000 output tokens
 *   → cost ≈ $0.000525 per generation
 *
 * When ledger_event_kernel.payload.tokens_consumed is present, use the
 * actual count; otherwise fall back to PER_GENERATION_COST_USD.
 */

export const INPUT_COST_PER_M  = 0.075   // USD per million input tokens
export const OUTPUT_COST_PER_M = 0.30    // USD per million output tokens
export const AVG_INPUT_TOKENS  = 3_000   // average per analysis call
export const AVG_OUTPUT_TOKENS = 1_000   // average per analysis call

/** Estimated cost for a single Gemini analysis call (USD) */
export const PER_GENERATION_COST_USD =
  (AVG_INPUT_TOKENS  * INPUT_COST_PER_M  / 1_000_000) +
  (AVG_OUTPUT_TOKENS * OUTPUT_COST_PER_M / 1_000_000)
// = $0.000525

/** Compute token cost from actual token counts or fall back to estimate */
export function computeTokenCost(
  tokensConsumed?: number | null,
): number {
  if (tokensConsumed && tokensConsumed > 0) {
    // If actual token count stored, split 75/25 input/output heuristic
    const input  = tokensConsumed * 0.75
    const output = tokensConsumed * 0.25
    return (input * INPUT_COST_PER_M + output * OUTPUT_COST_PER_M) / 1_000_000
  }
  // Fall back: count = 1 generation per event; script_count doesn't change LLM calls
  return PER_GENERATION_COST_USD
}

/** Plan monthly value in USD */
export const PLAN_MONTHLY_VALUE: Record<string, number> = {
  FREE:       0,
  PRO:       29,   // Creator tier
  ENTERPRISE: 99,  // Scale tier
}

/** Estimated monthly LTV based on plan */
export function planMonthlyValue(plan: string): number {
  return PLAN_MONTHLY_VALUE[plan] ?? 0
}

/** Format USD amount (handles negative values correctly) */
export function fmtUSD(amount: number, decimals = 2): string {
  if (amount === 0) return '$0'
  const sign = amount < 0 ? '−' : ''
  const abs  = Math.abs(amount)
  if (abs < 0.01) return `${sign}$${abs.toFixed(4)}`
  return `${sign}$${abs.toFixed(decimals)}`
}

/** Format large USD amounts with K/M suffix */
export function fmtUSDShort(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)     return `$${(amount / 1_000).toFixed(1)}K`
  return fmtUSD(amount)
}
