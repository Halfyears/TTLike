-- ============================================================
-- Finance & User Management admin enhancements
-- 2026-05-24
-- ============================================================

-- 1. Add accountStatus to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE';

-- 2. Create payment_configs table
CREATE TABLE IF NOT EXISTS payment_configs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider      TEXT NOT NULL UNIQUE,
  mode          TEXT NOT NULL DEFAULT 'sandbox',
  "secretKey"   TEXT,
  "publicKey"   TEXT,
  "webhookSecret" TEXT,
  "clientId"    TEXT,
  "extraConfig" JSONB,
  "isEnabled"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT now()
);

-- Seed default provider rows
INSERT INTO payment_configs (provider, mode, "isEnabled")
  VALUES ('stripe', 'sandbox', false)
  ON CONFLICT (provider) DO NOTHING;
INSERT INTO payment_configs (provider, mode, "isEnabled")
  VALUES ('paypal', 'sandbox', false)
  ON CONFLICT (provider) DO NOTHING;

-- 3. Create spam_rules table
CREATE TABLE IF NOT EXISTS spam_rules (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         TEXT NOT NULL,
  description  TEXT,
  "ruleType"   TEXT NOT NULL,
  config       JSONB,
  "autoAction" TEXT,
  "isEnabled"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMP NOT NULL DEFAULT now()
);

-- Seed default spam rules
INSERT INTO spam_rules (name, description, "ruleType", config, "autoAction", "isEnabled")
  VALUES
    ('Disposable Email Domains',
     'Block known disposable email services (mailinator, guerrillamail, etc.)',
     'disposable_email',
     '{"domains": ["mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email", "yopmail.com", "trashmail.com"]}',
     'set_pending', true),
    ('Bulk Registration Rate',
     'Flag if more than N registrations from same IP within a time window',
     'registration_rate',
     '{"max_registrations": 10, "window_minutes": 60}',
     'flag', false),
    ('Suspicious Email Pattern',
     'Block emails matching known spam/bot patterns',
     'email_pattern',
     '{"patterns": ["^[a-z]{1,3}[0-9]{6,}@", "test.*@test\\.com$"]}',
     'flag', false)
  ON CONFLICT DO NOTHING;
