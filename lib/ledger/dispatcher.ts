// ═══════════════════════════════════════════════════════════════════════════════
// ES-DCS v4.5.4 — MINIMAL DISPATCHER (MVP scope)
// ─────────────────────────────────────────────────────────────────────────────
// MVP simplification vs full spec:
//   • No bootstrapSystem (no full replay on every dispatch)
//   • Reads last known state from the most recent event row (O(1) query)
//   • UNIQUE constraint on event_idempotency_key = OCC guard
//   • Idempotent: duplicate dispatch returns the already-committed event
//
// Deferred to Phase 2:
//   • Full Snapshot + incremental replay (bootstrapSystem)
//   • Auto-snapshot every 100 events
//   • Outbox side-effect emission
// ─────────────────────────────────────────────────────────────────────────────
// MUST run server-side only (uses service_role Supabase client + Node crypto).
// ═══════════════════════════════════════════════════════════════════════════════

import 'server-only'
import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { State, LedgerEvent, LedgerCommand } from './types'
import { INITIAL_STATE } from './types'
import { applyTransition } from './transition'
import { verifyInvariant, InvariantError } from './verifier'

// ── Idempotency key computation ───────────────────────────────────────────────
// Spec §5.4: event_idempotency_key = hash(idempotency_key ‖ event_type ‖ from_state ‖ to_state)

const NUL = '\x00' // null-byte delimiter — prevents boundary-collision attacks

function computeEventKey(
  idempotencyKey: string,
  eventType:      string,
  fromState:      string,
  toState:        string,
): string {
  return createHash('sha256')
    .update(idempotencyKey).update(NUL)
    .update(eventType).update(NUL)
    .update(fromState).update(NUL)
    .update(toState)
    .digest('hex')
}

// ── Current state resolution (MVP: O(1) last-event lookup) ───────────────────

async function resolveCurrentState(
  supabase: SupabaseClient,
  aggregateId: string,
): Promise<State> {
  const { data } = await supabase
    .from('ledger_event_kernel')
    .select('to_state')
    .eq('aggregate_id', aggregateId)
    .order('sequence_id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.to_state) return { ...INITIAL_STATE }

  try {
    return JSON.parse(data.to_state) as State
  } catch {
    // Corrupt row — treat as initial state and let the new event override
    console.error(`[ES-DCS] Failed to parse to_state for aggregate ${aggregateId}`)
    return { ...INITIAL_STATE }
  }
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export class DispatchError extends Error {
  constructor(message: string, readonly pgCode?: string) {
    super(message)
    this.name = 'DispatchError'
    Object.setPrototypeOf(this, DispatchError.prototype)
  }
}

/**
 * dispatch — atomically appends one event to ledger_event_kernel.
 *
 * Flow:
 *   1. Resolve current state (last to_state row, or INITIAL_STATE)
 *   2. Compute next state via applyTransition (pure)
 *   3. Verify post-transition invariants
 *   4. Compute deterministic event_idempotency_key (SHA-256)
 *   5. INSERT to kernel — UNIQUE constraint is the OCC guard
 *   6. On PG-23505 (duplicate key): idempotent replay, return existing event
 *
 * Must be called with a service_role Supabase client to bypass RLS.
 */
export async function dispatch(
  supabase: SupabaseClient,
  command:  LedgerCommand,
): Promise<LedgerEvent> {

  // ── 1. Resolve current state ──────────────────────────────────────────────
  const currentState = await resolveCurrentState(supabase, command.aggregate_id)

  // ── 2. Pure state transition ──────────────────────────────────────────────
  const nextState = applyTransition(currentState, {
    event_type: command.event_type,
    payload:    command.payload ?? {},
  })

  // ── 3. Invariant guard ────────────────────────────────────────────────────
  if (!verifyInvariant(nextState)) {
    throw new InvariantError(command.aggregate_id, nextState)
  }

  // ── 4. Deterministic idempotency key ──────────────────────────────────────
  const fromJson = JSON.stringify(currentState)
  const toJson   = JSON.stringify(nextState)
  const eventKey = computeEventKey(command.idempotency_key, command.event_type, fromJson, toJson)

  // ── 5. Atomic kernel append ───────────────────────────────────────────────
  const row = {
    aggregate_id:          command.aggregate_id,
    user_id:               command.user_id ?? null,
    idempotency_key:       command.idempotency_key,
    event_type:            command.event_type,
    from_state:            fromJson,
    to_state:              toJson,
    event_idempotency_key: eventKey,
    schema_version:        1,
    payload:               command.payload ?? {},
  }

  const { data: inserted, error } = await supabase
    .from('ledger_event_kernel')
    .insert(row)
    .select()
    .single()

  // ── 6. Idempotent replay on duplicate ─────────────────────────────────────
  if (error) {
    if (error.code === '23505') {
      // Same event was already committed — return it (idempotent)
      const { data: existing, error: fetchError } = await supabase
        .from('ledger_event_kernel')
        .select('*')
        .eq('event_idempotency_key', eventKey)
        .single()

      if (!fetchError && existing) return existing as LedgerEvent
    }
    throw new DispatchError(
      `[ES-DCS] Kernel write failed for aggregate ${command.aggregate_id}: ${error.message}`,
      error.code,
    )
  }

  return inserted as LedgerEvent
}
