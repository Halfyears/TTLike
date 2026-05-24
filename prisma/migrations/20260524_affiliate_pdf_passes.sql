-- ══════════════════════════════════════════════════════════════════════════════
-- REQ-A1: White-label PDF pass — affiliate attribution + pass balance
-- ══════════════════════════════════════════════════════════════════════════════

-- Add affiliate attribution + PDF pass columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "affiliateCode"       TEXT,
  ADD COLUMN IF NOT EXISTS "whitelabelPdfPasses" INTEGER NOT NULL DEFAULT 0;

-- Index for affiliate code lookups
CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users("affiliateCode");
