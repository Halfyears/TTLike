-- ══════════════════════════════════════════════════════════════════════════════
-- Behaviour Insights v2 — REQ-2/3/4/5
-- ══════════════════════════════════════════════════════════════════════════════

-- ── REQ-2: Feature click tracking ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_click_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT        NOT NULL,           -- 'ai-scripts' | 'ai-studio' | 'products' | etc.
  page         TEXT        NOT NULL DEFAULT 'dashboard',
  plan         TEXT,                           -- snapshot of user's plan at click time
  clicked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fce_user       ON feature_click_events(user_id);
CREATE INDEX idx_fce_feature    ON feature_click_events(feature_name);
CREATE INDEX idx_fce_clicked_at ON feature_click_events(clicked_at);

-- Dwell time (aggregated sessions — we store only samples to keep writes low)
CREATE TABLE IF NOT EXISTS page_dwell_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page         TEXT        NOT NULL DEFAULT 'dashboard',
  dwell_seconds INT        NOT NULL CHECK (dwell_seconds > 0),
  plan         TEXT,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pde_user ON page_dwell_events(user_id);
CREATE INDEX idx_pde_page ON page_dwell_events(page, recorded_at);

-- ── REQ-3: Upgrade trigger attribution ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upgrade_trigger_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type  TEXT        NOT NULL,   -- 'loss_aversion' | 'fomo' | 'curiosity' | 'social_proof'
  cta_label     TEXT,                   -- e.g. 'Creator — CapCut Export'
  page          TEXT,                   -- 'products' | 'dashboard' | 'pricing'
  video_id      TEXT,                   -- tiktok_videos.id if visible
  insight_label TEXT,                   -- e.g. '留存暴跌14%' — the visible insight text
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata      JSONB
);
CREATE INDEX idx_ute_user    ON upgrade_trigger_events(user_id);
CREATE INDEX idx_ute_type    ON upgrade_trigger_events(trigger_type);
CREATE INDEX idx_ute_time    ON upgrade_trigger_events(triggered_at);

-- ── REQ-4: Time-segment label ───────────────────────────────────────────────────
ALTER TABLE user_behavior_profiles
  ADD COLUMN IF NOT EXISTS time_segment_label TEXT;
-- 早起型创作者(6-10) | 午间活跃(11-14) | 下午场(15-18) | 夜猫子(19-23) | 深夜玩家(0-5)

-- ── REQ-5: Niche profiling ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_niche_profiles (
  user_id        UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  niche          TEXT    NOT NULL,
  analysis_count INT     NOT NULL DEFAULT 0,
  percentage     NUMERIC(5,2),
  last_updated   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, niche)
);
CREATE INDEX idx_unp_user ON user_niche_profiles(user_id);

ALTER TABLE user_behavior_profiles
  ADD COLUMN IF NOT EXISTS niche_label TEXT;
-- 家居垂直大卖 | 美妆矩阵玩家 | 美食达人 | 多品类探索者 | etc.

-- RLS: users can read their own rows
ALTER TABLE feature_click_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_dwell_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_trigger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_niche_profiles    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fce_user_own"  ON feature_click_events   FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pde_user_own"  ON page_dwell_events      FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ute_user_own"  ON upgrade_trigger_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "unp_user_own"  ON user_niche_profiles    FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- service_role bypasses RLS for admin reads and all writes
