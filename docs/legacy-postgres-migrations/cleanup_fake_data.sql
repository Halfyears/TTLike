-- ── Fake data cleanup ─────────────────────────────────────────────────────────
-- Run STEP 1 first to preview what will be deleted, then run STEP 2.

-- STEP 1: Preview rows to be deleted
SELECT
  id,
  tiktok_id,
  LEFT(title, 80) AS title_preview,
  views, likes, shares,
  video_url,
  created_at
FROM tiktok_videos
WHERE
  -- No meaningful content (blank or hashtags-only title)
  TRIM(REGEXP_REPLACE(COALESCE(title, ''), '#\S+\s*', '', 'g')) = ''
  OR LENGTH(TRIM(COALESCE(title, ''))) < 3
  -- Zero engagement — likely failed or test records
  OR (views = 0 AND likes = 0 AND shares = 0 AND comments = 0)
  -- Non-TikTok video URLs (fake/placeholder links)
  OR (video_url IS NOT NULL AND video_url != '' AND video_url NOT LIKE '%tiktok.com%')
  -- Clearly fake tiktok_ids (non-numeric or very short)
  OR (tiktok_id ~ '^[0-9]+$') = false
ORDER BY created_at;


-- STEP 2: Delete after reviewing the preview above
DELETE FROM tiktok_videos
WHERE
  TRIM(REGEXP_REPLACE(COALESCE(title, ''), '#\S+\s*', '', 'g')) = ''
  OR LENGTH(TRIM(COALESCE(title, ''))) < 3
  OR (views = 0 AND likes = 0 AND shares = 0 AND comments = 0)
  OR (video_url IS NOT NULL AND video_url != '' AND video_url NOT LIKE '%tiktok.com%')
  OR (tiktok_id ~ '^[0-9]+$') = false;


-- STEP 3: Verify result
SELECT COUNT(*) AS remaining_videos FROM tiktok_videos;
