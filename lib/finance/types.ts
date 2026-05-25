/**
 * lib/finance/types.ts — Shared type definitions for the Finance dashboard.
 *
 * Kept in lib/ so client components can import the type without crossing the
 * server/client module boundary (API route files are server-only).
 */

export interface FinanceData {
  stripe: {
    enabled:         boolean
    account_name:    string | null
    charges_enabled: boolean | null
    error:           string | null
  }
  subscriptions: {
    total_paid:      number
    plan_creator:    number   // PRO
    plan_scale:      number   // ENTERPRISE
    plan_free:       number
    est_mrr:         number   // USD
    affiliate_spend: number   // USD (total revenue paid to affiliates)
    net_mrr:         number   // est_mrr - affiliate_spend
  }
  token_finops: {
    total_cost_usd:    number
    total_generations: number
    daily: Array<{
      date:         string
      cost_usd:     number
      generations:  number
      mrr_fraction: number  // daily share of monthly subscription revenue
    }>
  }
  ltv_ranking: Array<{
    user_id:      string
    email:        string
    name:         string | null   // display name (may be null for older accounts)
    plan:         string
    plan_value:   number   // monthly USD
    generations:  number   // total AI calls
    cogs_usd:     number   // estimated token cost
    net_usd:      number   // plan_value − cogs_usd
    cache_hits:   number
    label:        'whale' | 'healthy' | 'at_risk' | 'freeloader'
  }>
}
