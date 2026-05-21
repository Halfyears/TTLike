-- 1. Add published_at column to tiktok_videos
--    (stores the original TikTok video publish timestamp from createTime field)
ALTER TABLE tiktok_videos
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS tiktok_videos_published_at_idx
  ON tiktok_videos (published_at DESC);

-- 2. Create video_comments cache table
--    Comments are fetched on-demand via RapidAPI and cached here
CREATE TABLE IF NOT EXISTS video_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_id   TEXT        NOT NULL REFERENCES tiktok_videos(tiktok_id) ON DELETE CASCADE,
  comment_id  TEXT        UNIQUE,
  text        TEXT        NOT NULL,
  likes       INTEGER     DEFAULT 0,
  author      TEXT        DEFAULT '',
  fetched_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_comments_tiktok_id_idx
  ON video_comments (tiktok_id, likes DESC);

ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

-- Public can read cached comments
CREATE POLICY "public_read_comments"
  ON video_comments FOR SELECT USING (true);

-- 3. Quick date audit query (run separately to inspect your data)
-- SELECT DATE(COALESCE(published_at, created_at)) AS date,
--        COUNT(*) AS videos
-- FROM tiktok_videos
-- GROUP BY 1 ORDER BY 1 DESC LIMIT 30;
