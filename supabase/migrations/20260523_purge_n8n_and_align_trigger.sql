-- ── Purge n8n references, align to Trigger.dev ───────────────────────────────
-- Rename n8n_execution_id → trigger_run_id (vendor-neutral column name).
-- Handles 3 cases:
--   A) column exists as n8n_execution_id  → rename
--   B) trigger_run_id already exists      → no-op
--   C) neither exists                     → add trigger_run_id
-- Safe to run multiple times (idempotent).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'video_breakdowns'
      AND column_name  = 'n8n_execution_id'
  ) THEN
    ALTER TABLE public.video_breakdowns
      RENAME COLUMN n8n_execution_id TO trigger_run_id;
    RAISE NOTICE 'Renamed n8n_execution_id → trigger_run_id';

  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'video_breakdowns'
      AND column_name  = 'trigger_run_id'
  ) THEN
    ALTER TABLE public.video_breakdowns
      ADD COLUMN trigger_run_id TEXT;
    RAISE NOTICE 'Added trigger_run_id column';

  ELSE
    RAISE NOTICE 'trigger_run_id already exists — no-op';
  END IF;
END $$;

-- Verify final state
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'video_breakdowns'
  AND column_name  IN ('blog_status', 'ghost_post_id', 'trigger_run_id', 'blog_published_at')
ORDER BY column_name;
