-- Run this in Supabase SQL Editor
-- Creates scraper_logs table for monitoring fetch_tiktok.py runs

CREATE TABLE IF NOT EXISTS scraper_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status       TEXT        NOT NULL CHECK (status IN ('success', 'error')),
  message      TEXT        NOT NULL,
  videos_fetched  INT      NOT NULL DEFAULT 0,
  videos_updated  INT      NOT NULL DEFAULT 0,
  error_details   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordered reads
CREATE INDEX IF NOT EXISTS scraper_logs_created_at_idx ON scraper_logs (created_at DESC);

-- RLS: only service-role writes; anon reads blocked
ALTER TABLE scraper_logs ENABLE ROW LEVEL SECURITY;
