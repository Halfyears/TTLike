-- ── Supabase Storage cover cache ─────────────────────────────────────────────
-- Adds a permanent cover_storage_url column to tiktok_videos.
-- When populated, the frontend prefers this over the expiring TikTok CDN URL.
--
-- Storage setup (do this once in Supabase dashboard):
--   1. Storage → New bucket → Name: "covers" → Public: ON
--   2. That's it — the bucket policy allows public reads.

ALTER TABLE public.tiktok_videos
  ADD COLUMN IF NOT EXISTS cover_storage_url TEXT;

COMMENT ON COLUMN public.tiktok_videos.cover_storage_url IS
  'Permanent Supabase Storage URL for the video cover image. '
  'Preferred over cover_url (TikTok CDN, expires ~7 days after scrape).';

-- Index helps the admin cache-covers query find un-cached videos efficiently
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_cover_storage_null
  ON public.tiktok_videos (id)
  WHERE cover_storage_url IS NULL;
