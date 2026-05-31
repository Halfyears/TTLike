-- Migration: add user_id to video_breakdowns
-- Run once in Supabase SQL Editor (or via psql DIRECT_URL)
-- Enables per-user analysis history and Usage page tracking

ALTER TABLE video_breakdowns
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_video_breakdowns_user_id
  ON video_breakdowns(user_id)
  WHERE user_id IS NOT NULL;
