-- ── Video Management: soft-delete + manual sort order ───────────────────────
-- Run this in the Supabase SQL Editor.

-- 1. Soft-delete timestamp (NULL = active, non-NULL = deleted)
ALTER TABLE tiktok_videos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Admin-controlled display order (lower number = shown first)
ALTER TABLE tiktok_videos ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- 3. Seed sort_order for existing rows from current viral_score ranking
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY viral_score DESC NULLS LAST) AS rn
  FROM tiktok_videos
  WHERE deleted_at IS NULL
)
UPDATE tiktok_videos v
SET    sort_order = r.rn
FROM   ranked r
WHERE  v.id = r.id;

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_sort_order ON tiktok_videos(sort_order);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_deleted_at  ON tiktok_videos(deleted_at);

-- 5. Verify
SELECT
  COUNT(*) FILTER (WHERE deleted_at IS NULL)     AS active,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted,
  COUNT(*) FILTER (WHERE sort_order IS NOT NULL) AS with_sort_order
FROM tiktok_videos;
