-- Add viral_status + viral_error to video_breakdowns
-- Separates pipeline execution state from blog publication state (blog_status)

ALTER TABLE video_breakdowns
  ADD COLUMN IF NOT EXISTS viral_status TEXT DEFAULT 'PENDING'
    CHECK (viral_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  ADD COLUMN IF NOT EXISTS viral_error TEXT;

-- Index for polling queries
CREATE INDEX IF NOT EXISTS idx_video_breakdowns_viral_status
  ON video_breakdowns (viral_status);
