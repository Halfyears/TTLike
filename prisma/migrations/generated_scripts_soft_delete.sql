-- Run in Supabase SQL Editor.
-- Adds soft-delete support to generated_scripts.
-- User-visible deletions set deleted_at; the row is never hard-deleted
-- so the script data remains available as a shared resource.

ALTER TABLE generated_scripts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS generated_scripts_active_idx
  ON generated_scripts (user_id, created_at DESC)
  WHERE deleted_at IS NULL;
