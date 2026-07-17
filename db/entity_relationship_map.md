# ENTITY RELATIONSHIP MAP
# Faith Over Fear — Database Architecture
# Generated from runtime code analysis only

═══════════════════════════════════════════════════════════════
                        TABLE RELATIONSHIPS
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                        USERS (core entity)                      │
│  id, email, password_hash, name, google_id, created_at          │
└──────┬──────────────┬──────────────────┬────────────────────────┘
       │              │                  │
       │ CASCADE      │ SET NULL         │ SET NULL
       ▼              ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│PASSWORD_RESETS│ │   ORDERS     │ │   RESERVATIONS       │
│id, user_id   │ │id, user_id   │ │id, user_id           │
│token, expires│ │product_id    │ │full_name, email      │
└──────────────┘ │drop_id       │ │phone, product_id     │
                 │product_name  │ │size, color           │
                 │status        │ │quantity, quality     │
                 │...           │ │price_at_purchase     │
                 └──────┬───────┘ └──────────────────────┘
                        │
                        │ 1 user → many orders/reservations
                        │
                 ┌──────┴──────────────────────┐
                 │         ORDERS               │
                 │ (denormalized snapshots)     │
                 │ - product_name copied from   │
                 │   products at purchase time  │
                 │ - customer_name/email stored │
                 │   directly (not FK to users) │
                 └──────┬──────────────────────┘
                        │
                        │ 1 order → many order_items
                        ▼
                 ┌──────────────────┐
                 │   ORDER_ITEMS    │
                 │id, order_id      │
                 │product_id (FK)   │
                 │product_name      │
                 │quantity, size    │
                 │color, quality    │
                 │price_at_purchase │
                 └──────────────────┘


═══════════════════════════════════════════════════════════════
                        PRODUCT HIERARCHY
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                        DROPS                                   │
│  id, title, description, image_url, release_date               │
│  status, type, created_at, updated_at                          │
│                                                                │
│  NOTE: collection_id intentionally OMITTED (dead column)       │
│  NOTE: stock intentionally OMITTED (dead column)               │
└──────┬──────────────────────────────────────┐
       │ 1 drop → many products               │
       │ ON DELETE SET NULL                    │
       ▼                                      │
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTS                                │
│  id, drop_id, name, description, price                        │
│  sizes (JSONB), colors (JSONB), image_urls (JSONB)             │
│  is_active, created_at, updated_at                             │
└──────┬──────────────────────────────────────┐
       │ 1 product → many quality prices      │
       │ ON DELETE CASCADE (product gone,     │
       │ its prices go too)                    │
       ▼                                      │
┌─────────────────────────────────────────────────────────────────┐
│                   PRODUCT_QUALITY_PRICES                       │
│  id, product_id, quality_level_id, price                      │
│  is_active, created_at, updated_at                             │
│                                                                │
│  UNIQUE(product_id, quality_level_id)                          │
│  FK quality_level_id → RESTRICT (can't delete quality if       │
│    prices reference it)                                        │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════
                        QUALITY LEVELS
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                   QUALITY_LEVELS                                │
│  id, name, description, sort_order, is_active                  │
│                                                                │
│  Seeded: Essential (1), Premium (2), Luxe (3)                  │
│  is_active = FALSE soft-deletes the level (hidden from UI)     │
└──────┬──────────────────────┬──────────────────────────────────┘
       │                      │
       │ RESTRICT             │ SET NULL
       │ (can't delete if     │ (reservation/order
       │  prices reference)   │  quality cleared)
       ▼                      ▼
┌──────────────────┐  ┌──────────────────────┐
│ PRODUCT_QUALITY  │  │   ORDERS             │
│ PRICES           │  │   quality_level_id   │
│ (on products)    │  └──────────────────────┘
└──────────────────┘          │
                              │ SET NULL
                              ▼
                       ┌──────────────────┐
                       │   ORDER_ITEMS    │
                       │   quality_level_id
                       └──────────────────┘
                              │ SET NULL
                              ▼
                       ┌──────────────────┐
                       │ RESERVATIONS     │
                       │ quality_level_id │
                       └──────────────────┘


═══════════════════════════════════════════════════════════════
                        SINGLETON / CONFIG TABLES
═══════════════════════════════════════════════════════════════

┌──────────────────────┐     ┌──────────────────────┐
│   STORE_CONFIG       │     │    SETTINGS           │
│   id=1 (enforced)    │     │   key-value pairs     │
│   store_mode         │     │   purchasingDisabled  │
│   announcement       │     │   isRestocking        │
└──────────────────────┘     └──────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐
│   ANNOUNCEMENTS      │     │   NOTIFICATIONS       │
│   id=1 (implicit)    │     │   Admin inbox         │
│   title, message     │     │   type + reference_id │
│   image_url, button  │     │   is_seen flag         │
│   is_enabled, version│     │   (no FKs)             │
└──────────────────────┘     └──────────────────────┘

┌──────────────────────┐
│   CONTACT_MESSAGES   │
│   name, email        │
│   subject, message   │
│   status             │
│   (no FKs)            │
└──────────────────────┘


═══════════════════════════════════════════════════════════════
                        RELATIONSHIP CARDINALITY SUMMARY
═══════════════════════════════════════════════════════════════

users ──── 1:N ──── password_resets         (CASCADE delete)
users ──── 1:N ──── orders                  (SET NULL on delete)
users ──── 1:N ──── reservations            (SET NULL on delete)

drops ──── 1:N ──── products                (SET NULL on delete)

products ──── 1:N ──── product_quality_prices (CASCADE delete)
products ──── 1:N ──── order_items           (SET NULL on delete)
products ──── 1:N ──── orders                (SET NULL on delete)
products ──── 1:N ──── reservations          (SET NULL on delete)

quality_levels ──── 1:N ──── product_quality_prices (RESTRICT delete)
quality_levels ──── 1:N ──── orders                (SET NULL on delete)
quality_levels ──── 1:N ──── order_items           (SET NULL on delete)
quality_levels ──── 1:N ──── reservations          (SET NULL on delete)

orders ──── 1:N ──── order_items            (CASCADE delete)

DENORMALIZATION MAP:
  orders.product_name ← products.name (at purchase time, snapshot)
  orders.size ← products.size or items.size (snapshot)
  orders.color ← products.color or items.color (snapshot)
  orders.customer_name ← users.name OR input (snapshot)
  orders.customer_email ← users.email OR input (snapshot)
  reservations.product_name ← products.name (at reservation time, snapshot)
  order_items.product_name ← products.name (snapshot)