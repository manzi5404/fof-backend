-- ============================================================
-- FAITH OVER FEAR — PRODUCTION-READY SUPABASE/POSTGRESQL SCHEMA
-- ============================================================
-- Generated: 2026-05-15
-- Updated:  2026-06-30 — fixed users.id to UUID matching auth.users,
--            added role + updated_at columns, aligned FK types.
-- Source of truth: models/*.js + controllers/*.js (runtime code behavior)
-- IGNORED: schema.sql, migrations, db/init.js (inconsistent/corrupted)
-- 
-- Paste this ENTIRE file into the Supabase SQL Editor and click "Run".
-- ============================================================

BEGIN;

-- ============================================================
-- 0. CLEAN SLATE — DROP EVERYTHING
-- ============================================================

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS product_quality_prices CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS waitlist CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS quality_levels CASCADE;
DROP TABLE IF EXISTS drops CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS store_config CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS collection_products CASCADE;
DROP TABLE IF EXISTS collections CASCADE;

DROP TYPE IF EXISTS drop_status_type CASCADE;
DROP TYPE IF EXISTS drop_type_type CASCADE;
DROP TYPE IF EXISTS order_status_type CASCADE;
DROP TYPE IF EXISTS reservation_status_type CASCADE;
DROP TYPE IF EXISTS store_mode_type CASCADE;
DROP TYPE IF EXISTS contact_status_type CASCADE;
DROP TYPE IF EXISTS announcement_status_type CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================
-- 1. CUSTOM ENUM TYPES
-- ============================================================

CREATE TYPE drop_status_type AS ENUM ('upcoming', 'reservation', 'live', 'closed');
CREATE TYPE drop_type_type AS ENUM ('new-drop', 'recent-drop');
CREATE TYPE order_status_type AS ENUM ('pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled');
CREATE TYPE reservation_status_type AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE store_mode_type AS ENUM ('live', 'reserve', 'closed');
CREATE TYPE contact_status_type AS ENUM ('unread', 'read', 'replied');
CREATE TYPE announcement_status_type AS ENUM ('live', 'draft', 'archived');

-- ============================================================
-- 2. USERS
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),
    name            VARCHAR(255),
    google_id       VARCHAR(255) UNIQUE,
    role            VARCHAR(50) NOT NULL DEFAULT 'customer',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- ============================================================
-- 3. PASSWORD_RESETS
-- ============================================================

CREATE TABLE password_resets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_password_resets_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_resets_token ON password_resets (token);

-- ============================================================
-- 4. DROPS
-- ============================================================

CREATE TABLE drops (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    image_url       VARCHAR(512),
    release_date    TIMESTAMPTZ,
    status          drop_status_type NOT NULL DEFAULT 'upcoming',
    type            drop_type_type NOT NULL DEFAULT 'new-drop',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drops_status ON drops (status);
CREATE INDEX idx_drops_type ON drops (type);

-- NOTE: collection_id and stock columns intentionally OMITTED.
-- collection_id: never queried/used in any code path
-- stock: added by migration, never used in any code

-- ============================================================
-- 5. QUALITY_LEVELS
-- ============================================================

CREATE TABLE quality_levels (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quality_levels_active ON quality_levels (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_quality_levels_sort ON quality_levels (sort_order);

-- Seed defaults (from code logic)
INSERT INTO quality_levels (name, description, sort_order, is_active) VALUES
    ('Essential', 'Everyday tees, solid quality, standard cotton. Focus on comfort and value.', 1, TRUE),
    ('Premium', 'Softer fabrics, better fit, stronger collar and seams. Emphasizes durability and shape retention.', 2, TRUE),
    ('Luxe', 'High-end fabrics, very soft handfeel, best construction. Maximum comfort and longevity.', 3, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. PRODUCTS
-- ============================================================

CREATE TABLE products (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    drop_id         BIGINT,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    price           NUMERIC(15, 2) NOT NULL,
    sizes           JSONB,
    colors          JSONB,
    image_urls      JSONB,
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_products_drop
        FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE SET NULL
);

CREATE INDEX idx_products_drop ON products (drop_id);
CREATE INDEX idx_products_active ON products (status) WHERE status = 'live';

-- ============================================================
-- 7. PRODUCT_QUALITY_PRICES
-- ============================================================

CREATE TABLE product_quality_prices (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id          BIGINT NOT NULL,
    quality_level_id    BIGINT NOT NULL,
    price               NUMERIC(15, 2) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pqp_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_pqp_quality
        FOREIGN KEY (quality_level_id) REFERENCES quality_levels(id) ON DELETE RESTRICT,
    CONSTRAINT uq_product_quality UNIQUE (product_id, quality_level_id)
);

-- NOTE: ON DELETE RESTRICT is correct here — code uses soft-delete (is_active)
-- for price records, and hard-delete is blocked if quality_level is referenced.

-- ============================================================
-- 8. ORDERS
-- ============================================================

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    product_id          BIGINT,
    drop_id             BIGINT,
    product_name        VARCHAR(255),
    size                VARCHAR(50),
    color               VARCHAR(50),
    quantity            INTEGER NOT NULL DEFAULT 1,
    quality_level_id    BIGINT,
    price_at_purchase   NUMERIC(15, 2),
    total_price         NUMERIC(15, 2) NOT NULL,
    status              order_status_type NOT NULL DEFAULT 'pending',
    payment_method      VARCHAR(50) NOT NULL DEFAULT 'reservation',
    customer_name       VARCHAR(255),
    customer_email      VARCHAR(255),
    phone_number        VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_orders_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_orders_drop
        FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE SET NULL,
    CONSTRAINT fk_orders_quality
        FOREIGN KEY (quality_level_id) REFERENCES quality_levels(id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

-- NOTE: product_name, size, color are SNAPSHOT fields.
-- If single-item order: copied from the item.
-- If multi-item order: product_name = 'Multiple Products', size/color/quantity = aggregate.

-- ============================================================
-- 9. ORDER_ITEMS
-- ============================================================

CREATE TABLE order_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id          BIGINT,
    product_name        VARCHAR(255),
    quantity            INTEGER NOT NULL DEFAULT 1,
    size                VARCHAR(50),
    color               VARCHAR(50),
    quality_level_id    BIGINT,
    price_at_purchase   NUMERIC(15, 2),
    total_price         NUMERIC(15, 2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_order_items_quality
        FOREIGN KEY (quality_level_id) REFERENCES quality_levels(id) ON DELETE SET NULL
);

-- NOTE: 'price' column intentionally OMITTED — it exists in root schema.sql
-- but is NEVER referenced in any code. price_at_purchase is the actual field used.

-- ============================================================
-- 10. RESERVATIONS
-- ============================================================

CREATE TABLE reservations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name           VARCHAR(255),
    email               VARCHAR(255),
    phone               VARCHAR(50),
    product_id          BIGINT,
    product_name        VARCHAR(255),
    size                VARCHAR(20),
    color               VARCHAR(50),
    quantity            INTEGER NOT NULL DEFAULT 1,
    quality_level_id    BIGINT,
    price_at_purchase   NUMERIC(15, 2),
    store_mode          VARCHAR(50) NOT NULL DEFAULT 'live',
    status              reservation_status_type NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reservations_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_reservations_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_reservations_quality
        FOREIGN KEY (quality_level_id) REFERENCES quality_levels(id) ON DELETE SET NULL
);

-- NOTE: There is no models/reservation.js file. The reservationController
-- uses raw pool.query() directly. This is a code architecture issue to fix.

-- ============================================================
-- 11. STORE_CONFIG (Singleton: id = 1)
-- ============================================================

CREATE TABLE store_config (
    id           INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    store_mode   store_mode_type NOT NULL DEFAULT 'closed',
    announcement TEXT,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO store_config (id, store_mode, announcement)
VALUES (1, 'closed', 'Welcome to Faith Over Fear')
ON CONFLICT (id) DO NOTHING;

-- NOTE: Controller handles legacy column names 'mode' and 'announcement_message'
-- but those columns are intentionally NOT created in this schema.

-- ============================================================
-- 11b. WAITLIST (emails captured while the site is closed)
-- ============================================================

CREATE TABLE waitlist (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(255),
    email       VARCHAR(255) NOT NULL UNIQUE,
    phone       VARCHAR(50),
    source      VARCHAR(50),
    notified    BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. SETTINGS (key-value feature flags)
-- ============================================================

CREATE TABLE settings (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key         VARCHAR(255) NOT NULL UNIQUE,
    value       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTE: Column names are 'key' and 'value' (NOT 'setting_key'/'setting_value').
-- The models/settings.js file queries 'setting_key' and 'setting_value' which
-- means it MUST be updated to use 'key' and 'value' (see migration report).

INSERT INTO settings (key, value) VALUES
    ('purchasingDisabled', 'false'),
    ('isRestocking', 'false'),
    ('siteStatus', 'live'),
    ('siteClosedImages', '[]')
ON CONFLICT (key) DO NOTHING;

-- Allow public (anon) reads of settings so the storefront/admin can fetch site status.
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read settings" ON settings;
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);

-- ============================================================
-- 13. ANNOUNCEMENTS (Singleton: id = 1)
-- ============================================================

CREATE TABLE announcements (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       VARCHAR(255),
    message     TEXT,
    image_url   VARCHAR(512),
    button_text VARCHAR(50) NOT NULL DEFAULT 'SHOP THE DROP',
    is_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    version     INTEGER NOT NULL DEFAULT 1,
    status      announcement_status_type NOT NULL DEFAULT 'live',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO announcements (id, title, message, button_text, is_enabled, version, status)
VALUES (1, 'Welcome to F>F', 'New drops are coming.', 'SHOP THE DROP', FALSE, 1, 'live')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 14. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type         VARCHAR(50),
    reference_id BIGINT,
    title        VARCHAR(255),
    description  TEXT,
    is_seen      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_seen ON notifications (is_seen);

-- NOTE: Uses 'description' (NOT 'message') and 'is_seen' (NOT 'is_read').
-- The root schema.sql had 'description' (correct). db/schema.sql had both
-- 'message' and 'description' — the 'message' column is DEAD.

-- ============================================================
-- 15. CONTACT_MESSAGES
-- ============================================================

CREATE TABLE contact_messages (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    subject    VARCHAR(255) NOT NULL DEFAULT 'General Inquiry',
    message    TEXT NOT NULL,
    status     contact_status_type NOT NULL DEFAULT 'unread',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 15b. COLLECTIONS
-- ============================================================

CREATE TABLE collections (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug         VARCHAR(255) NOT NULL UNIQUE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    image_url    VARCHAR(512),
    status       VARCHAR(50) NOT NULL DEFAULT 'draft',
    sort_order   INTEGER NOT NULL DEFAULT 0,
    featured     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_collections_status ON collections (status);
CREATE INDEX idx_collections_sort ON collections (sort_order);
CREATE INDEX idx_collections_featured ON collections (featured) WHERE featured = TRUE;

-- ============================================================
-- 15c. COLLECTION_PRODUCTS (many-to-many join)
-- ============================================================

CREATE TABLE collection_products (
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

CREATE INDEX idx_collection_products_collection ON collection_products (collection_id);
CREATE INDEX idx_collection_products_product ON collection_products (product_id);

CREATE TRIGGER trg_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER FUNCTION: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_drops_updated_at
    BEFORE UPDATE ON drops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_quality_levels_updated_at
    BEFORE UPDATE ON quality_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pqp_updated_at
    BEFORE UPDATE ON product_quality_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_store_config_updated_at
    BEFORE UPDATE ON store_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_contact_messages_updated_at
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (run these after to confirm everything)
-- ============================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position;