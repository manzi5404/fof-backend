-- ============================================================
-- FAITH OVER FEAR — COLLECTIONS FEATURE
-- Migration: 2026-07-10
-- Adds curated "collections" of products (independent of time-based drops).
-- Safe / additive: uses CREATE TABLE IF NOT EXISTS (does NOT drop existing tables).
-- Run in the Supabase SQL Editor.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. COLLECTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug         VARCHAR(255) NOT NULL UNIQUE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    image_url    VARCHAR(512),
    status       VARCHAR(50) NOT NULL DEFAULT 'draft',   -- draft | live | archived
    sort_order   INTEGER NOT NULL DEFAULT 0,
    featured     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_status ON collections (status);
CREATE INDEX IF NOT EXISTS idx_collections_sort ON collections (sort_order);
CREATE INDEX IF NOT EXISTS idx_collections_featured ON collections (featured) WHERE featured = TRUE;

-- ------------------------------------------------------------
-- 2. COLLECTION_PRODUCTS (many-to-many join)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collection_products (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    collection_id  BIGINT NOT NULL,
    product_id     BIGINT NOT NULL,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_collection_products_collection
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    CONSTRAINT fk_collection_products_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uq_collection_product UNIQUE (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_products_collection ON collection_products (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products (product_id);

-- ------------------------------------------------------------
-- 3. updated_at trigger (reuse existing function)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_collections_updated_at ON collections;
CREATE TRIGGER trg_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- 4. Seed a sample collection (idempotent)
-- ------------------------------------------------------------
INSERT INTO collections (slug, title, description, status, sort_order, featured)
VALUES ('essentials', 'Essentials', 'The everyday staples — timeless pieces built to last.', 'live', 1, TRUE)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Verification:
-- SELECT * FROM collections;
-- SELECT c.title, p.name FROM collection_products cp
--   JOIN collections c ON c.id = cp.collection_id
--   JOIN products p ON p.id = cp.product_id
--   ORDER BY c.sort_order, cp.sort_order;
