-- ── Video Breakdown Cache Table ───────────────────────────────────────────────
-- Stores Gemini-generated structured ad analysis for each video.
-- Cache-first: once generated, never re-billed.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS video_breakdowns (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url_hash    TEXT        UNIQUE NOT NULL,        -- md5 of video_id or source URL
  video_id    UUID        REFERENCES tiktok_videos(id) ON DELETE SET NULL,
  payload     JSONB       NOT NULL,               -- VideoBreakdownPayload
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE OR REPLACE FUNCTION update_video_breakdowns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_video_breakdowns_updated_at ON video_breakdowns;
CREATE TRIGGER trg_video_breakdowns_updated_at
  BEFORE UPDATE ON video_breakdowns
  FOR EACH ROW EXECUTE FUNCTION update_video_breakdowns_updated_at();

CREATE INDEX IF NOT EXISTS idx_video_breakdowns_video_id ON video_breakdowns(video_id);
CREATE INDEX IF NOT EXISTS idx_video_breakdowns_url_hash ON video_breakdowns(url_hash);

-- RLS
ALTER TABLE video_breakdowns ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "auth_full_access"
  ON video_breakdowns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public can read (for product pages)
CREATE POLICY "public_read"
  ON video_breakdowns FOR SELECT
  TO anon
  USING (true);

SELECT COUNT(*) AS breakdowns_count FROM video_breakdowns;
