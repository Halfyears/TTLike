-- Run this in the Supabase SQL Editor.
-- Creates the generated_scripts table for storing AI-generated script history.

CREATE TABLE IF NOT EXISTS generated_scripts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name    TEXT        NOT NULL DEFAULT '',
  niche           TEXT        DEFAULT '',
  hook_type       TEXT        DEFAULT '',
  scripts         JSONB       NOT NULL DEFAULT '[]',
  source_video_id UUID,
  keywords        TEXT        DEFAULT '',
  brand_name      TEXT        DEFAULT '',
  offer           TEXT        DEFAULT '',
  script_count    SMALLINT    DEFAULT 5,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS generated_scripts_user_created_idx
  ON generated_scripts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS generated_scripts_user_product_idx
  ON generated_scripts (user_id, product_name);

CREATE INDEX IF NOT EXISTS generated_scripts_user_niche_idx
  ON generated_scripts (user_id, niche);

ALTER TABLE generated_scripts ENABLE ROW LEVEL SECURITY;

-- Each user can only read/write their own rows
CREATE POLICY "users_own_scripts_all"
  ON generated_scripts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
