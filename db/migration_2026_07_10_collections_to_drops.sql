-- ============================================================
-- FAITH OVER FEAR — CONVERT COLLECTIONS FROM PRODUCTS TO DROPS
-- Migration: 2026-07-10-collections-to-drops
-- ============================================================

BEGIN;

-- 1. Create collection_drops join table
CREATE TABLE IF NOT EXISTS collection_drops (
    id BIGSERIAL PRIMARY KEY,
    collection_id BIGINT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    drop_id BIGINT NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, drop_id)
);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_collection_drops_collection_id ON collection_drops(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_drops_drop_id ON collection_drops(drop_id);

-- 3. Drop old collection_products table (if it exists and has no important data)
DROP TABLE IF EXISTS collection_products CASCADE;

COMMIT;

-- To migrate existing data from collection_products to collection_drops:
-- You would need to map products to their parent drops, then insert into collection_drops
-- Example:
-- INSERT INTO collection_drops (collection_id, drop_id, sort_order)
-- SELECT DISTINCT cp.collection_id, p.drop_id, cp.sort_order
-- FROM old_collection_products cp
-- JOIN products p ON cp.product_id = p.id
-- WHERE p.drop_id IS NOT NULL;
