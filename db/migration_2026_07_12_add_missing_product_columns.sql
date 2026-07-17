-- ============================================================
-- FAITH OVER FEAR — ADD MISSING PRODUCT COLUMNS
-- Migration: 2026-07-12-add-missing-product-columns
-- ============================================================

BEGIN;

-- Add image_urls column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_urls') THEN
        ALTER TABLE products ADD COLUMN image_urls JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add quantity column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'quantity') THEN
        ALTER TABLE products ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- Add size column if it doesn't exist (for single-size products)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'size') THEN
        ALTER TABLE products ADD COLUMN size VARCHAR(50);
    END IF;
END $$;

COMMIT;

-- Verification:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position;
