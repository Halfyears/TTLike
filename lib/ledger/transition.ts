// ═══════════════════════════════════════════════════════════════════════════════
// ES-DCS v4.5.4 — PURE TRANSITION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
// HARD RULES — enforced by code review, never relaxed:
//   ✗  NO Date.now() / new Date() / Math.random() / crypto.randomUUID()
//   ✗  NO fetch() / DB calls / any I/O
//   ✗  NO console.* / process.env.*
//   ✗  NO mutation of the input `state` object
//   ✓  Pure algebraic map: (State, event) → State
//   ✓  Total function — every input has a defined output
//
// Spec defect fix: business constants (tokens_consumed, billed_amount_cents)
// are now read from event.payload instead of being hardcoded.
// This preserves deterministic replay while allowing different pricing tiers.
// ═══════════════════════════════════════════════════════════════════════════════

import type { State, LedgerEvent } from './types'

type EventSlice = Readonly<Pick<LedgerEvent, 'event_type' | 'payload'>>

export const applyTransition = (
  state:  Readonly<State>,
  event:  EventSlice,
): State => {
  switch (event.event_type) {

    case 'COMPLETE':
      return {
        ...state,
        job_status:          'COMPLETED',
        // Read from payload — spec defect fix (was hardcoded 1 / 5)
        tokens_consumed:     Number(event.payload?.tokens_consumed     ?? 1),
        billed_amount_cents: Number(event.payload?.billed_amount_cents ?? 0), // 0 in MVP
      }

    case 'FAIL':
      return {
        ...state,
        job_status: 'FAILED',
      }

    case 'COMPENSATE':
      // Spec defect fix: guard against compensating an already-terminal aggregate
      if (state.comp_status === 'COMPENSATED_TERMINAL') return state
      return {
        ...state,
        comp_status:    'COMPENSATED_TERMINAL',
        comp_finalized: true,
      }

    default: {
      // Exhaustive-safety: unknown event types are silently ignored during replay.
      // DO NOT throw — throwing is a side effect and breaks replay determinism.
      const _: never = event.event_type as never
      void _
      return state
    }
  }
}
