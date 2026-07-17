-- ============================================================
-- SAFE MIGRATION: Site Close/Open + Waitlist
-- Run this in the Supabase SQL Editor (the project in SUPABASE_URL).
-- NON-DESTRUCTIVE: only creates what is missing, never drops data.
-- ============================================================

-- 1. Settings table (key-value feature flags)
CREATE TABLE IF NOT EXISTS settings (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key         VARCHAR(255) NOT NULL UNIQUE,
    value       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Seed the keys the admin + storefront need (no-op if they exist)
INSERT INTO settings (key, value) VALUES
    ('purchasingDisabled', 'false'),
    ('isRestocking', 'false'),
    ('siteStatus', 'live'),
    ('siteClosedImages', '[]')
ON CONFLICT (key) DO NOTHING;

-- 3. Allow storing a JSON array of model-image URLs in siteClosedImages
--    (safe no-op if the column is already TEXT)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'value'
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE settings ALTER COLUMN value TYPE TEXT;
    END IF;
END $$;

-- 4. Waitlist table (emails captured while the site is closed)
CREATE TABLE IF NOT EXISTS waitlist (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(255),
    email       VARCHAR(255) NOT NULL UNIQUE,
    phone       VARCHAR(50),
    source      VARCHAR(50),
    notified    BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Allow public (anon) reads of settings (storefront/admin fetch site status)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read settings" ON settings;
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);
