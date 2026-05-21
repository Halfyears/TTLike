-- ═══════════════════════════════════════════════════════════════════════════════
-- ES-DCS v4.5.4 — MINIMAL KERNEL MIGRATION
-- Run in Supabase SQL Editor (service_role / superuser).
--
-- Scope (MVP):
--   • ledger_event_kernel   ← immutable truth source
--   • system_truth_contract ← baseline contract record
--
-- Deferred to Phase 2:
--   • tenant_usage_ledger   (projection + REVOKE)
--   • state_snapshot        (performance snapshots)
--   • side_effect_outbox    (async side-effect bus)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Immutable event kernel ─────────────────────────────────────────────────
-- Spec defect fix: added aggregate_id, user_id, payload (missing from spec DDL)

CREATE TABLE IF NOT EXISTS ledger_event_kernel (
  sequence_id            BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Aggregate scope (spec defect fix — was missing)
  aggregate_id           TEXT        NOT NULL,   -- logical unit, e.g. user_id:job_id
  user_id                UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event identity
  idempotency_key        TEXT        NOT NULL,   -- business-level key (caller supplied)
  event_type             TEXT        NOT NULL    -- COMPLETE | FAIL | COMPENSATE
                           CHECK (event_type IN ('COMPLETE', 'FAIL', 'COMPENSATE')),

  -- State algebra (from_state / to_state are JSON-serialized State objects)
  from_state             TEXT        NOT NULL,
  to_state               TEXT        NOT NULL,

  -- Physical OCC lock: SHA-256( idempotency_key ‖ event_type ‖ from_state ‖ to_state )
  event_idempotency_key  TEXT        NOT NULL    UNIQUE,

  -- Schema evolution (for upcast adapter)
  schema_version         INT         NOT NULL    DEFAULT 1,

  -- Optional structured context (spec defect fix — was missing)
  payload                JSONB       NOT NULL    DEFAULT '{}',

  emitted_at             TIMESTAMPTZ             DEFAULT NOW()
);

-- Query index: load events for a given aggregate in causal order
CREATE INDEX IF NOT EXISTS ledger_event_kernel_aggregate_seq_idx
  ON ledger_event_kernel (aggregate_id, sequence_id ASC);

-- Query index: per-user event history
CREATE INDEX IF NOT EXISTS ledger_event_kernel_user_idx
  ON ledger_event_kernel (user_id, sequence_id DESC);

-- ── 2. Row-level security ─────────────────────────────────────────────────────
-- Users can read their own events; only service_role can write.

ALTER TABLE ledger_event_kernel ENABLE ROW LEVEL SECURITY;

-- Read: each user sees only their own events
CREATE POLICY "ledger_kernel_user_select"
  ON ledger_event_kernel FOR SELECT
  USING (auth.uid() = user_id);

-- Write: blocked for all — application writes via service_role client only.
-- This enforces "only Dispatcher can append to the kernel".
CREATE POLICY "ledger_kernel_no_direct_write"
  ON ledger_event_kernel FOR INSERT
  WITH CHECK (false);  -- service_role bypasses RLS automatically

-- ── 3. System truth contract baseline ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_truth_contract (
  contract_name    TEXT  PRIMARY KEY,
  truth_source     TEXT  NOT NULL,
  enforcement_mode TEXT  NOT NULL
);

INSERT INTO system_truth_contract VALUES (
  'v4.5.4_event_sourced_system',
  'ledger_event_kernel',
  'strict_append_only'
) ON CONFLICT (contract_name) DO NOTHING;
