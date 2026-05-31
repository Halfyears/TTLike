-- Migration: BadgeLog table for v1.6 Courage-Based Progress System
-- Run once in Supabase SQL Editor (or via psql DIRECT_URL)

CREATE TABLE IF NOT EXISTS badge_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    text NOT NULL,
  "badgeType" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_logs_user_id   ON badge_logs ("userId");
CREATE INDEX IF NOT EXISTS idx_badge_logs_user_type ON badge_logs ("userId", "badgeType");
