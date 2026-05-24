-- ── Admin Enhancements Migration ────────────────────────────────────────────
-- 1. admin_config    : runtime key-value store (AI prompt hot-update, feature flags)
-- 2. is_viral_hit    : flag videos analysed ≥ 5 times by users (super viral radar)
-- 3. referral_source : record UTM/affiliate source at user registration

-- ── 1. admin_config ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_config (
  key        text        PRIMARY KEY,
  value      text        NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service role can read/write (admin API routes use service client)
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only" ON admin_config USING (false);

-- Seed: empty prompt override (empty = use hardcoded default in parserPrompt.ts)
INSERT INTO admin_config (key, value)
VALUES ('ai_prompt_override', '')
ON CONFLICT (key) DO NOTHING;

-- ── 2. tiktok_videos.is_viral_hit ────────────────────────────────────────────
-- Set to true by /api/admin/viral-radar when breakdown count for this video >= 5
ALTER TABLE tiktok_videos
  ADD COLUMN IF NOT EXISTS is_viral_hit boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tiktok_videos_viral_hit
  ON tiktok_videos (is_viral_hit)
  WHERE is_viral_hit = true;

-- ── 3. users.referral_source ─────────────────────────────────────────────────
-- Populated from ?ref= / UTM params at sign-up (handled in auth callback)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_source text;

CREATE INDEX IF NOT EXISTS idx_users_referral_source
  ON users (referral_source)
  WHERE referral_source IS NOT NULL;
