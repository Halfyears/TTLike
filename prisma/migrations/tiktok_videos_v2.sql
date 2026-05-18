-- Run this in Supabase SQL Editor.
-- Drops the old tiktok_videos table (if any) and recreates it with the
-- snake_case schema that scripts/fetch_tiktok.py writes to.
--
-- IMPORTANT: Back up existing data first if you have any.

DROP TABLE IF EXISTS tiktok_videos CASCADE;

CREATE TABLE tiktok_videos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_id        TEXT        UNIQUE NOT NULL,
  title            TEXT        NOT NULL DEFAULT '',
  author           TEXT        DEFAULT '',
  views            INTEGER     DEFAULT 0,
  likes            INTEGER     DEFAULT 0,
  shares           INTEGER     DEFAULT 0,
  comments         INTEGER     DEFAULT 0,
  viral_score      FLOAT       DEFAULT 0,
  video_url        TEXT,
  cover_url        TEXT,
  author_avatar_url TEXT,
  niche            TEXT,
  product_name     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX tiktok_videos_viral_score_idx ON tiktok_videos (viral_score DESC);
CREATE INDEX tiktok_videos_niche_idx        ON tiktok_videos (niche);
CREATE INDEX tiktok_videos_created_at_idx   ON tiktok_videos (created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tiktok_videos_updated_at
  BEFORE UPDATE ON tiktok_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE tiktok_videos ENABLE ROW LEVEL SECURITY;

-- Allow public reads; service-role key handles writes (bypasses RLS)
CREATE POLICY "public_read" ON tiktok_videos FOR SELECT USING (true);
