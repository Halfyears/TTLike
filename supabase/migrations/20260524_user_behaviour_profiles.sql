-- ═══════════════════════════════════════════════════════════════════════════════
-- User Behaviour Profiles + Admin Config Seeds
-- Run in Supabase SQL Editor (service_role / superuser).
--
-- Adds:
--   • user_behavior_profiles  — computed operator labels per user
--   • user_analytics columns  — feature_name, context_data for hotspot tracking
--   • admin_config seed       — scraper_fallback_enabled flag
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. User behavior profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_behavior_profiles (
  user_id         UUID        PRIMARY KEY
                              REFERENCES auth.users(id) ON DELETE CASCADE,
  peak_hour       INT         CHECK (peak_hour >= 0 AND peak_hour <= 23),
  total_analyses  INT         NOT NULL DEFAULT 0,
  profile_label   TEXT,       -- '高频操作手' | '重度用户' | '活跃用户' | '轻度探索者'
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ubp_profile_label ON user_behavior_profiles (profile_label);

ALTER TABLE user_behavior_profiles ENABLE ROW LEVEL SECURITY;

-- service_role (used by all admin API routes) bypasses RLS automatically.
-- Authenticated users can read only their own profile row.
-- No authenticated write path — all writes come from service_role compute job.
CREATE POLICY "ubp_user_read_own"
  ON user_behavior_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 2. Extend user_analytics for feature-click hotspot tracking ──────────────
ALTER TABLE user_analytics ADD COLUMN IF NOT EXISTS feature_name TEXT;
ALTER TABLE user_analytics ADD COLUMN IF NOT EXISTS context_data JSONB;

CREATE INDEX IF NOT EXISTS idx_ua_feature_name
  ON user_analytics (feature_name) WHERE feature_name IS NOT NULL;

-- ── 3. Admin config seeds ─────────────────────────────────────────────────────
INSERT INTO admin_config (key, value, updated_at)
VALUES ('scraper_fallback_enabled', 'false', now())
ON CONFLICT (key) DO NOTHING;
