-- Run in Supabase SQL Editor.
-- Shared script cache: reduces token usage by reusing generated scripts
-- across users for the same video + hook_type combination.

CREATE TABLE IF NOT EXISTS script_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    UUID        NOT NULL,       -- references tiktok_videos(id)
  hook_type   TEXT        NOT NULL,
  scripts     JSONB       NOT NULL DEFAULT '[]',
  hit_count   INTEGER     NOT NULL DEFAULT 1,
  cache_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (video_id, hook_type, cache_date)
);

CREATE INDEX IF NOT EXISTS script_cache_lookup_idx
  ON script_cache (video_id, hook_type, cache_date);

CREATE OR REPLACE FUNCTION update_script_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER script_cache_updated_at
  BEFORE UPDATE ON script_cache
  FOR EACH ROW EXECUTE FUNCTION update_script_cache_updated_at();

-- Shared data — all authenticated users can read; API writes via user session
ALTER TABLE script_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_cache"
  ON script_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_cache"
  ON script_cache FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_cache"
  ON script_cache FOR UPDATE TO authenticated USING (true);

-- Atomic hit-count increment (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_script_cache_hits(cache_id UUID)
RETURNS VOID AS $$
  UPDATE script_cache SET hit_count = hit_count + 1 WHERE id = cache_id;
$$ LANGUAGE SQL SECURITY DEFINER;
