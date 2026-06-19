-- Backfill published_at using created_at for existing records
-- where published_at is still NULL (scraped before we added the column).
-- Note: created_at = when we scraped the video, NOT the original publish date.
-- This gives users a visible date; future scraper runs will populate the real date.

UPDATE tiktok_videos
SET published_at = created_at
WHERE published_at IS NULL;

-- Verify
SELECT
  COUNT(*) FILTER (WHERE published_at IS NOT NULL) AS with_date,
  COUNT(*) FILTER (WHERE published_at IS NULL)     AS without_date
FROM tiktok_videos;
