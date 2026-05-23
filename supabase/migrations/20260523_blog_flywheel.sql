-- ── SEO Content Flywheel: blog publishing status on video_breakdowns ─────────
-- Adds lightweight columns to track Ghost/n8n publication state.
-- Run this in the Supabase SQL Editor.

-- 1. Status column with CHECK constraint
ALTER TABLE public.video_breakdowns
  ADD COLUMN IF NOT EXISTS blog_status TEXT DEFAULT 'NOT_SENT'
    CHECK (blog_status IN ('NOT_SENT', 'PROCESSING', 'PUBLISHED', 'FAILED'));

-- 2. Ghost CMS post ID (populated when n8n POSTs back via callback)
ALTER TABLE public.video_breakdowns
  ADD COLUMN IF NOT EXISTS ghost_post_id TEXT;

-- 3. n8n execution/workflow ID for debugging
ALTER TABLE public.video_breakdowns
  ADD COLUMN IF NOT EXISTS n8n_execution_id TEXT;

-- 4. Timestamp when the post went live
ALTER TABLE public.video_breakdowns
  ADD COLUMN IF NOT EXISTS blog_published_at TIMESTAMPTZ;

-- 5. Index for the flywheel dashboard query (filters by status)
CREATE INDEX IF NOT EXISTS idx_video_breakdowns_blog_status
  ON public.video_breakdowns (blog_status);

-- 6. Verify
SELECT
  blog_status,
  COUNT(*) AS count
FROM public.video_breakdowns
GROUP BY blog_status;
