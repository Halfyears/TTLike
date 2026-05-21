// ═══════════════════════════════════════════════════════════════════════════════
// ES-DCS v4.5.4 — TYPE CONTRACT (MVP scope)
// ═══════════════════════════════════════════════════════════════════════════════

export type JobStatus  = 'INIT' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type CompStatus = 'NONE' | 'PENDING_RECONCILE' | 'COMPENSATED_TERMINAL'
export type EventType  = 'COMPLETE' | 'FAIL' | 'COMPENSATE'

/**
 * Aggregate state — produced exclusively by folding events through applyTransition.
 * Never written directly to the DB by business code.
 *
 * Notes on MVP scope:
 *   tokens_consumed     — counts generation units; billing is deferred (Phase 2)
 *   billed_amount_cents — reserved for Phase 2 billing; always 0 in MVP
 *   comp_*              — reserved for Phase 2 refund flow
 */
export interface State {
  job_status:          JobStatus
  comp_status:         CompStatus
  tokens_consumed:     number
  billed_amount_cents: number   // Phase 2 — kept in schema for future fold compatibility
  comp_finalized:      boolean  // Phase 2
}

export const INITIAL_STATE: Readonly<State> = Object.freeze({
  job_status:          'INIT',
  comp_status:         'NONE',
  tokens_consumed:     0,
  billed_amount_cents: 0,
  comp_finalized:      false,
})

// ── Event kernel row (mirrors ledger_event_kernel table) ──────────────────────

export interface LedgerEvent {
  sequence_id?:          number
  aggregate_id:          string
  user_id?:              string
  idempotency_key:       string
  event_type:            EventType
  from_state:            string   // JSON.stringify(State)
  to_state:              string   // JSON.stringify(State)
  event_idempotency_key: string   // SHA-256 OCC lock
  schema_version:        number
  payload:               Record<string, unknown>
  emitted_at?:           string
}

// ── Dispatcher input ──────────────────────────────────────────────────────────

export interface LedgerCommand {
  aggregate_id:    string
  user_id?:        string
  idempotency_key: string   // caller-supplied; format: `${userId}:${jobId}:${eventType}`
  event_type:      EventType
  /**
   * Payload keys used by applyTransition (spec defect fix — no more hardcoded constants):
   *   tokens_consumed?:     number  (default 1)
   *   billed_amount_cents?: number  (default 0, billing deferred)
   */
  payload?: Record<string, unknown>
}
