-- ── Promotion Management Table ───────────────────────────────────────────────
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS promotions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to a TikTok video (optional — can exist without a specific video)
  video_id         UUID        REFERENCES tiktok_videos(id) ON DELETE SET NULL,

  -- Product info
  product_name     TEXT        NOT NULL,
  description      TEXT,

  -- Supplier / brand
  supplier_name    TEXT,
  supplier_url     TEXT,

  -- Affiliate platform details
  platform         TEXT,           -- 'amazon' | 'tiktok_shop' | 'shareasale' | 'cj' | 'rakuten' | 'custom'
  affiliate_code   TEXT,           -- tracking / referral code
  affiliate_username TEXT,         -- username on the affiliate platform
  affiliate_url    TEXT,           -- full tracking URL

  -- Performance stats (updated externally or via API)
  commission_rate  DECIMAL(5,2)  DEFAULT 0,   -- percentage, e.g. 5.50 means 5.5%
  clicks           INTEGER       DEFAULT 0    NOT NULL,
  conversions      INTEGER       DEFAULT 0    NOT NULL,
  revenue          DECIMAL(12,2) DEFAULT 0    NOT NULL,

  is_active        BOOLEAN       DEFAULT true NOT NULL,
  created_at       TIMESTAMPTZ   DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ   DEFAULT now() NOT NULL
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_promotions_updated_at ON promotions;
CREATE TRIGGER trg_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION update_promotions_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promotions_video_id   ON promotions(video_id);
CREATE INDEX IF NOT EXISTS idx_promotions_is_active  ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_platform   ON promotions(platform);

-- RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Authenticated (admin) users can do everything
CREATE POLICY "auth_full_access"
  ON promotions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public can read active promotions (for future storefront use)
CREATE POLICY "public_read_active"
  ON promotions FOR SELECT
  TO anon
  USING (is_active = true);

-- Verify
SELECT COUNT(*) AS promotions_count FROM promotions;
