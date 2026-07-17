-- ============================================================
-- FAITH OVER FEAR — ADD DROP TYPE COLUMN
-- Migration: 2026-07-10-add-drop-type
-- ============================================================

BEGIN;

-- 1. Create the enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drop_type_type') THEN
        CREATE TYPE drop_type_type AS ENUM ('new-drop', 'recent-drop');
    END IF;
END $$;

-- 2. Add the type column to drops table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drops' AND column_name = 'type') THEN
        ALTER TABLE drops ADD COLUMN type drop_type_type NOT NULL DEFAULT 'new-drop';
    END IF;
END $$;

-- 3. Create index on type if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_drops_type ON drops (type);

COMMIT;

-- Verification:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'drops' ORDER BY ordinal_position;
