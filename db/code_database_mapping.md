# CODE ↔ DATABASE MAPPING REPORT
# Faith Over Fear — Runtime Code to Database Traceability
# Every table, every query, every potential breaking point

═══════════════════════════════════════════════════════════════
TABLE: users
═══════════════════════════════════════════════════════════════
Used by files:
  - models/user.js                    (all 7 queries)
  - controllers/authController.js     (signup, login, googleLogin, forgotPassword)
  - controllers/reservationController.js  (resolvedFullName lookup)
  - controllers/orderController.js    (getAllOrders — LEFT JOIN)
  - controllers/reservationController.js (getReservations — LEFT JOIN)
  - controllers/dropController.js     (getAllUserEmails for notifications)

Queries:
  INSERT:  email, password_hash, name, google_id
  SELECT:  email | id | google_id
  UPDATE:  password_hash | google_id
  JOIN:    LEFT JOIN on orders.user_id, reservations.user_id

Breaking points for migration:
  ✅ No issues — standard table, straightforward mapping


═══════════════════════════════════════════════════════════════
TABLE: password_resets
═══════════════════════════════════════════════════════════════
Used by files:
  - models/passwordReset.js           (all 4 queries)
  - controllers/authController.js     (forgotPassword, resetPassword)

Queries:
  INSERT:  user_id, token, expires_at
  SELECT:  token (with NOW() comparison)
  DELETE:  token | user_id

Breaking points for migration:
  — expires_at stored as DATETIME in MySQL → TIMESTAMPTZ in PG
  — NOW() is compatible with PG ✅
  — Result: result.insertId → result.rows[0].id in PG


═══════════════════════════════════════════════════════════════
TABLE: drops
═══════════════════════════════════════════════════════════════
Used by files:
  - models/drop.js                    (all 4 queries)
  - controllers/dropController.js     (createDrop, listDrops, updateDrop)
  - models/product.js                 (products.drop_id FK)
  - controllers/orderController.js    (orders.drop_id FK)

Queries:
  INSERT:  title, description, image_url, release_date, status, type, collection_id
  SELECT:  All columns, filtered by status, ordered by created_at DESC
  UPDATE:  title, description, image_url, release_date, status, type, collection_id
  DELETE:  By id
  JOIN:    orders.drop_id, products.drop_id

Breaking points for migration:
  ⚠️  'type' column — ENUM in MySQL → must match PG ENUM drop_type_type ✅
  ⚠️  image_url VARCHAR(512) in root schema vs VARCHAR(255) in db/schema.sql
     → Resolved: VARCHAR(512) per root schema (more permissive)
  ⚠️  Controller checks dropData.is_active (line 154: item.is_active)
     → No 'is_active' column exists in any schema for drops
       This is a code bug: the controller falls back gracefully, but the
       condition `item.is_active ? 'live' : 'upcoming'` is dead code
  ⚠️  collection_id: never actually used in any code path → OMITTED from new schema


═══════════════════════════════════════════════════════════════
TABLE: products
═══════════════════════════════════════════════════════════════
Used by files:
  - models/product.js                 (all 6 queries + transactions)
  - controllers/productController.js  (all 5 endpoints)
  - controllers/orderController.js    (price lookup)
  - controllers/reservationController.js (price lookup)
  - controllers/dropController.js     (priceByDrop aggregation)

Queries:
  INSERT:  drop_id, name, description, price, sizes, colors, image_urls, is_active
  SELECT:  All columns by drop_id | id | all
  UPDATE:  name, description, price, sizes, colors, image_urls, is_active
  DELETE:  By id
  JOIN:    orders.product_id, order_items.product_id, reservations.product_id

Critical JSON handling:
  — sizes, colors, image_urls stored as JSON arrays
  — Code: JSON.stringify() on INSERT/UPDATE
  — Code: JSON.parse() when typeof === 'string' on SELECT
  — In PostgreSQL with JSONB, pg driver returns native JS objects
  — **JSON.parse() on JSONB will FAIL because pg already returns parsed objects**
  → models/product.js must be updated to NOT parse JSONB results

Breaking points for migration:
  ⚠️  CRITICAL: pg driver returns JSONB as native JS arrays/objects
      Current code: typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes
      This is actually handled gracefully — the fallback will just return the
      already-parsed object. ✅ Safe, but the string branch is dead code.
  ⚠️  is_active TINYINT(1) → BOOLEAN — code uses is_active ? 1 : 0
      In PG, pass TRUE/FALSE or use the ternary as-is (1/0 cast automatically)


═══════════════════════════════════════════════════════════════
TABLE: quality_levels
═══════════════════════════════════════════════════════════════
Used by files:
  - models/qualityLevel.js            (all 7 queries)
  - controllers/qualityLevelController.js (all 5 endpoints)
  - models/productQualityPrice.js     (JOIN in 4 queries)
  - controllers/reservationController.js (LEFT JOIN)
  - controllers/orderController.js    (LEFT JOIN)

Queries:
  SELECT:  By is_active, all, by id
  INSERT:  name, description, sort_order
  UPDATE:  name, description, sort_order, is_active
  DELETE:  By id (soft), hard delete with price check
  JOIN:    via product_quality_prices, directly on orders/reservations

Breaking points for migration:
  ✅ No issues — straightforward table, clean mapping


═══════════════════════════════════════════════════════════════
TABLE: product_quality_prices
═══════════════════════════════════════════════════════════════
Used by files:
  - models/productQualityPrice.js     (all 8 queries)
  - models/product.js                 (insert/update with ON DUPLICATE KEY)
  - models/order.js                   (price validation: getActiveQualityPrice)
  - controllers/reservationController.js (getActiveQualityPrice)
  - controllers/orderController.js    (getActiveQualityPrice)

Queries:
  INSERT + ON DUPLICATE KEY UPDATE:  (MySQL upsert — must change to ON CONFLICT)
  SELECT:  By product_id, by product_id+quality_id, multi-product batch
  UPDATE:  is_active = 0 (soft delete)
  DELETE:  By product_id (full cleanup)
  JOIN:    quality_levels for name/description/sort_order

Breaking points for migration:
  ⚠️  CRITICAL: INSERT ... ON DUPLICATE KEY UPDATE must become
      INSERT ... ON CONFLICT (product_id, quality_level_id) DO UPDATE SET
      Used in: models/product.js (2 places), models/productQualityPrice.js (2 places)
  ⚠️  result.insertId on INSERT IGNORE → PG: INSERT ... ON CONFLICT DO NOTHING
      returns no id — must use RETURNING id or check rowCount


═══════════════════════════════════════════════════════════════
TABLE: orders
═══════════════════════════════════════════════════════════════
Used by files:
  - models/order.js                   (all 5 queries with JOINs)
  - controllers/orderController.js    (all 4 endpoints)

Queries:
  INSERT:  user_id, product_id, drop_id, product_name, size, color,
           quantity, quality_level_id, price_at_purchase, total_price,
           status, payment_method, customer_name, customer_email, phone_number
  SELECT:  With LEFT JOIN products and LEFT JOIN users (multiple variants)
  UPDATE:  status only

Breaking points for migration:
  ⚠️  ENUM('pending','confirmed','completed','cancelled') → order_status_type
  ⚠️  result.insertId → RETURNING id
  ⚠️  affectedRows → rowCount
  ⚠️  Implicit GROUP BY in getAllOrders (no explicit GROUP BY clause)
      — MySQL allows this, PostgreSQL does NOT by default
      — Query uses aggregate columns without GROUP BY → will ERROR in PG
      → This is actually just a SELECT with WHERE and ORDER BY, no aggregates
        Wait — let me re-check...
        SELECT o.*, p.name, p.image_urls, u.name, u.email
        FROM orders o LEFT JOIN products p JOIN users u WHERE ...
        ORDER BY o.created_at DESC
        → No GROUP BY needed, it's a flat SELECT with JOINs ✅


═══════════════════════════════════════════════════════════════
TABLE: order_items
═══════════════════════════════════════════════════════════════
Used by files:
  - models/orderItem.js               (1 query: INSERT)
  - models/order.js                   (implicit: bulk INSERT in createOrder)

Queries:
  INSERT:  order_id, product_id, product_name, quantity, size, color,
           quality_level_id, price_at_purchase, total_price

Breaking points for migration:
  ✅ No issues — the 'price' column from root schema.sql is NOT used
     and is intentionally omitted from the new schema


═══════════════════════════════════════════════════════════════
TABLE: reservations
═══════════════════════════════════════════════════════════════
Used by files:
  - controllers/reservationController.js (all queries — NO model file exists)

Queries:
  INSERT:  user_id, full_name, email, phone, product_id, product_name,
           size, color, quantity, quality_level_id, price_at_purchase,
           store_mode, status
  SELECT:  Complex JOIN with products, users, quality_levels
  UPDATE:  status only
  DELETE:  By id

Breaking points for migration:
  ⚠️  CRITICAL: NO models/reservation.js file exists
      → Controller uses raw pool.query() directly
      → All query parameter placeholders (?) must be changed to $1, $2... for pg
  ⚠️  ENUM for status → reservation_status_type
  ⚠️  result.insertId → result.rows[0].id
  ⚠️  affectedRows → rowCount


═══════════════════════════════════════════════════════════════
TABLE: store_config
═══════════════════════════════════════════════════════════════
Used by files:
  - controllers/storeConfigController.js (get/update with dynamic column detection)
  - middleware/storeModeMiddleware.js   (SELECT store_mode WHERE id=1)

Queries:
  SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS (MySQL-specific!)
  SELECT * FROM store_config WHERE id = 1
  INSERT INTO store_config (id, store_mode, announcement)
  UPDATE store_config SET store_mode/announcement/banner_enabled WHERE id = 1

Breaking points for migration:
  ⚠️  CRITICAL: INFORMATION_SCHEMA.COLUMNS query to detect column names
      is MySQL-specific! Works in PG too but different column name:
      MySQL: SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      PG:    SELECT column_name FROM information_schema.columns
      Same concept — but code checks for 'column_name' vs 'COLUMN_NAME'
      → The key returned by PG is lowercase 'column_name' (vs MySQL 'COLUMN_NAME')
      → storeConfigController.js line 13: c.COLUMN_NAME must change to c.column_name
  ⚠️  store_config columns 'mode', 'announcement_message', 'banner_enabled'
      are NOT in new schema (dead/legacy columns)
      → Controller gracefully handles missing columns, but new code should clean up


═══════════════════════════════════════════════════════════════
TABLE: settings
═══════════════════════════════════════════════════════════════
Used by files:
  - models/settings.js (all 2 queries)
  - controllers/settingsController.js (delegates to model)

Queries:
  SELECT setting_key, setting_value FROM settings
  UPDATE settings SET setting_value = ? WHERE setting_key = ?

BREAKING: Column name mismatch!
  Schema defines: key, value
  Code queries: setting_key, setting_value
  → This WILL FAIL at runtime unless the actual MySQL table has setting_key/setting_value
  → In new PG schema, using key/value (matching actual schemas)
  → models/settings.js MUST be updated

Breaking points for migration:
  ⚠️  CRITICAL: Column names in code don't match schema definitions
  ⚠️  `key` is a reserved word in PG — must be quoted: "key"
  ⚠️  pg driver requires proper quoting


═══════════════════════════════════════════════════════════════
TABLE: announcements
═══════════════════════════════════════════════════════════════
Used by files:
  - models/announcement.js             (2 queries)
  - controllers/announcementController.js (get/update/broadcast)
  - controllers/dropController.js     (auto-update announcement on new/live drops)

Queries:
  SELECT * FROM announcements WHERE id = 1 LIMIT 1
  UPDATE announcements SET title, message, image_url, button_text,
    is_enabled, version, status WHERE id = 1
  INSERT INTO announcements (id, title, message, ...) VALUES (1, ...)

Breaking points for migration:
  ⚠️  UPDATE then check affectedRows === 0, then INSERT for fallback
      → PG: Use INSERT ... ON CONFLICT (id) DO UPDATE SET
  ⚠️  result.affectedRows → result.rowCount


═══════════════════════════════════════════════════════════════
TABLE: notifications
═══════════════════════════════════════════════════════════════
Used by files:
  - models/notification.js            (all 6 queries)
  - controllers/reservationController.js (createNotification)
  - controllers/orderController.js    (createNotification)
  - controllers/contactController.js  (createNotification)

Queries:
  INSERT:  type, reference_id, title, description, is_seen (FALSE)
  SELECT:  All, filtered by is_seen, ORDER BY created_at DESC LIMIT 50
  UPDATE:  is_seen = TRUE by id, or bulk set all is_seen = TRUE
  COUNT:   COUNT(*) WHERE is_seen = FALSE

Breaking points for migration:
  ⚠️  uses FALSE/TRUE keywords — compatible with PG BOOLEAN ✅
  ⚠️  result.insertId → result.rows[0].id
  ⚠️  affectedRows → rowCount


═══════════════════════════════════════════════════════════════
TABLE: contact_messages
═══════════════════════════════════════════════════════════════
Used by files:
  - models/contactMessage.js          (all 4 queries)
  - controllers/contactController.js  (delegates to model)

Queries:
  INSERT:  name, email, subject, message, status
  SELECT:  All, filtered by status, ORDER BY created_at DESC
  SELECT:  By id
  UPDATE:  status by id

Breaking points for migration:
  ✅ No issues — straightforward table
  ⚠️  ENUM('unread','read','replied') → contact_status_type


═══════════════════════════════════════════════════════════════
═══════════════════════════════════════════════════════════════

CROSS-CUTTING CONCERNS:

1. ALL pool.query() with '?' placeholders must become $1, $2, etc.
   OR the pg driver must be configured with { simplify: false }
   (The `pg` npm package uses $1, $2 by default)

2. ALL result.insertId must become result.rows[0].id (with RETURNING id)

3. ALL result.affectedRows must become result.rowCount

4. ALL INSERT IGNORE must become INSERT ... ON CONFLICT DO NOTHING

5. ALL ON DUPLICATE KEY UPDATE must become ON CONFLICT ... DO UPDATE SET

6. NOW() is compatible with PostgreSQL ✅

7. connection.release() → pool client management changes (pg.Pool vs mysql2 Pool)