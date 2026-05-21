// ═══════════════════════════════════════════════════════════════════════════════
// ES-DCS v4.5.4 — INVARIANT VERIFIER (MVP: pure predicate only)
// ─────────────────────────────────────────────────────────────────────────────
// RuntimeFormalVerifier (strict/audit/bypass modes) is deferred to Phase 2
// when billing is activated and PagerDuty integration is needed.
// MVP uses a single synchronous boolean check at the Dispatcher call site.
// ═══════════════════════════════════════════════════════════════════════════════

import type { State } from './types'

/**
 * verifyInvariant — pure boolean predicate (zero I/O, zero side effects).
 *
 * Three invariants per spec §4:
 *   Inv 1: tokens_consumed = 1  ⇒  job_status = COMPLETED
 *   Inv 2: billed_amount_cents = 5  ⇒  job_status = COMPLETED
 *   Inv 3: comp_finalized = true  ⇒  comp_status ≠ NONE
 */
export const verifyInvariant = (state: Readonly<State>): boolean => {
  if (state.tokens_consumed > 0 && state.job_status !== 'COMPLETED') return false
  if (state.billed_amount_cents > 0 && state.job_status !== 'COMPLETED') return false
  if (state.comp_finalized && state.comp_status === 'NONE') return false
  return true
}

export class InvariantError extends Error {
  constructor(aggregate_id: string, state: State) {
    super(
      `[ES-DCS] Invariant violation — aggregate: ${aggregate_id} ` +
      `| state: ${JSON.stringify(state)}`,
    )
    this.name = 'InvariantError'
    Object.setPrototypeOf(this, InvariantError.prototype)
  }
}
