-- ============================================================
-- TTLike Billing Tiers — Quota Tracking Table
-- Migration: 20260523_billing_tiers.sql
-- Tiers: free (5 analyses) | creator ($29) | scale ($99)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_billing_tiers (
    user_id              UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    tier_name            VARCHAR(20) NOT NULL DEFAULT 'free'
                         CHECK (tier_name IN ('free', 'creator', 'scale')),
    -- Video analysis quota
    video_analysis_used  INT         NOT NULL DEFAULT 0,
    video_analysis_limit INT         NOT NULL DEFAULT 5,
    -- Strategy audit quota (Structural Health Report)
    strategy_audit_used  INT         NOT NULL DEFAULT 0,
    strategy_audit_limit INT         NOT NULL DEFAULT 0,
    -- Custom hook / teleprompter quota
    custom_hook_used     INT         NOT NULL DEFAULT 0,
    custom_hook_limit    INT         NOT NULL DEFAULT 0,
    -- Reset cycle
    reset_at             TIMESTAMP WITH TIME ZONE DEFAULT (date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'),
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sub-millisecond lookups on route guard path
CREATE INDEX IF NOT EXISTS idx_billing_tiers_user_id
    ON public.user_billing_tiers(user_id);

-- ── Helper: auto-insert free row for new users ───────────────────────────────
-- Called by trigger or manually on first analysis attempt
CREATE OR REPLACE FUNCTION public.ensure_billing_tier(uid UUID)
RETURNS void AS $$
  INSERT INTO public.user_billing_tiers (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── Helper: increment video analysis credit ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_analysis_credit(uid UUID)
RETURNS void AS $$
  UPDATE public.user_billing_tiers
  SET    video_analysis_used = video_analysis_used + 1,
         updated_at          = CURRENT_TIMESTAMP
  WHERE  user_id = uid;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── Helper: increment strategy audit credit ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_audit_credit(uid UUID)
RETURNS void AS $$
  UPDATE public.user_billing_tiers
  SET    strategy_audit_used = strategy_audit_used + 1,
         updated_at          = CURRENT_TIMESTAMP
  WHERE  user_id = uid;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── Helper: upgrade tier (called by Stripe webhook) ─────────────────────────
CREATE OR REPLACE FUNCTION public.set_user_tier(uid UUID, new_tier VARCHAR(20))
RETURNS void AS $$
  INSERT INTO public.user_billing_tiers (
      user_id, tier_name,
      video_analysis_limit, strategy_audit_limit, custom_hook_limit
  )
  VALUES (
      uid, new_tier,
      CASE new_tier WHEN 'creator' THEN 50  WHEN 'scale' THEN 500 ELSE 5  END,
      CASE new_tier WHEN 'creator' THEN 20  WHEN 'scale' THEN 50  ELSE 0  END,
      CASE new_tier WHEN 'creator' THEN 100 WHEN 'scale' THEN 500 ELSE 0  END
  )
  ON CONFLICT (user_id) DO UPDATE SET
      tier_name            = EXCLUDED.tier_name,
      video_analysis_limit = EXCLUDED.video_analysis_limit,
      strategy_audit_limit = EXCLUDED.strategy_audit_limit,
      custom_hook_limit    = EXCLUDED.custom_hook_limit,
      updated_at           = CURRENT_TIMESTAMP;
$$ LANGUAGE sql SECURITY DEFINER;
