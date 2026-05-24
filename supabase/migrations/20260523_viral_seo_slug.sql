-- ── SEO slug for /viral/ pages ────────────────────────────────────────────────
-- Adds a seo_slug column to video_breakdowns so each breakdown gets a
-- human-readable, crawlable URL instead of a raw UUID.
--
-- Format: posture-corrector-health-emotional-hook-strategy-a1b2c3d4
-- The 8-char suffix is the first 8 hex chars of tiktok_videos.id — guarantees
-- uniqueness without a separate uniqueness check.
--
-- After running this migration:
--   1. New breakdowns auto-populate seo_slug via the /api/analyze route.
--   2. Existing breakdowns get their slug the first time someone visits the
--      old /viral/{uuid} URL (lazy backfill via 301 redirect in the page).
--   3. Sitemap and admin links pick up the slug column automatically.

ALTER TABLE public.video_breakdowns
  ADD COLUMN IF NOT EXISTS seo_slug TEXT;

COMMENT ON COLUMN public.video_breakdowns.seo_slug IS
  'SEO-friendly URL slug for /viral/ pages. '
  'Format: {product}-{niche}-{strategy}-{8-char-video-uuid-prefix}. '
  'Populated by /api/analyze on insert; legacy rows backfilled on first visit.';

-- Index for fast slug lookups (viral page route handler)
CREATE INDEX IF NOT EXISTS idx_video_breakdowns_seo_slug
  ON public.video_breakdowns (seo_slug)
  WHERE seo_slug IS NOT NULL;
