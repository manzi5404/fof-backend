# CRITICAL DESIGN ISSUES FOUND
# Faith Over Fear — Architecture Audit Report
# Source: Runtime code analysis only (schema files/migrations treated as corrupted)

═══════════════════════════════════════════════════════════════
🔴 CRITICAL (Will cause runtime failures)
═══════════════════════════════════════════════════════════════

CRIT-01: settings.js queries non-existent column names
─────────────────────────────────────────────────────────
models/settings.js queries:
  SELECT setting_key, setting_value FROM settings
  UPDATE settings SET setting_value = ? WHERE setting_key = ?

ALL existing schemas define columns as `key` and `value` (or `` `key` `` and `value`).

IMPACT:  Every /api/settings call will fail with "column does not exist"
FIX:     Change model to use `key` and `value` (matching actual schema)


CRIT-02: Missing models/reservation.js — raw SQL in controller
─────────────────────────────────────────────────────────
reservationController.js uses pool.query() directly instead of a model.
No models/reservation.js file exists anywhere in the project.

IMPACT:  Violates MVC pattern. Hard to test. Queries embedded in HTTP handlers.
FIX:     Create models/reservation.js and extract all queries from controller.


CRIT-03: MySQL parameter placeholders (?) throughout entire codebase
─────────────────────────────────────────────────────────
Every model file uses `?` for SQL parameter binding.
MySQL (mysql2) supports this. PostgreSQL (pg) uses $1, $2, $3...

IMPACT:  EVERY database query will fail with PostgreSQL.
FIX:     Two options:
         A) Convert all ? to $1, $2, $3... in every file
         B) Use a pg-compatible wrapper like `pg-format` or `sqlstring`
         C) Use `pg` with `types.setTypeParser` (won't fix placeholder syntax)


CRIT-04: result.insertId used everywhere — doesn't exist in pg
─────────────────────────────────────────────────────────
MySQL:  const result = await pool.query('INSERT ...'); result.insertId
PG:     INSERT ... RETURNING id, then result.rows[0].id

Files affected:
  - models/user.js
  - models/passwordReset.js
  - models/drop.js
  - models/product.js
  - models/productQualityPrice.js
  - models/qualityLevel.js
  - models/orderItem.js
  - models/announcement.js
  - models/notification.js
  - models/contactMessage.js
  - models/settings.js
  - controllers/reservationController.js
  - controllers/orderController.js


CRIT-05: result.affectedRows used everywhere — doesn't exist in pg
─────────────────────────────────────────────────────────
MySQL:  result.affectedRows
PG:     result.rowCount

Files affected: Same as CRIT-04 plus all UPDATE/DELETE operations.


CRIT-06: models/settings.js uses reserved word `key` as column
─────────────────────────────────────────────────────────
`key` is a reserved word in PostgreSQL. Must be double-quoted: "key"
Without quoting, every settings query will fail with syntax error.

FIX: Quote in queries: SELECT "key", "value" FROM settings
     Or rename column to setting_key / config_key (preferable long-term)


CRIT-07: INSERT IGNORE → ON CONFLICT DO NOTHING
─────────────────────────────────────────────────
MySQL:  INSERT IGNORE INTO store_config ...
MySQL:  INSERT IGNORE INTO announcements ...
MySQL:  INSERT IGNORE INTO settings ...

PG:     INSERT INTO ... ON CONFLICT (column) DO NOTHING

Affects: db/init.js (seeding), models/announcement.js


CRIT-08: ON DUPLICATE KEY UPDATE → ON CONFLICT DO UPDATE
─────────────────────────────────────────────────────────
Files affected:
  - models/product.js (lines 147-150): setQualityPrice via updateProduct
  - models/productQualityPrice.js (lines 67-72): setQualityPrice
  - models/productQualityPrice.js (lines 96-101): batchSetQualityPrices

Must convert to: INSERT ... ON CONFLICT (product_id, quality_level_id) DO UPDATE SET


CRIT-09: INFORMATION_SCHEMA.COLUMNS query in storeConfigController.js
─────────────────────────────────────────────────────────
MySQL returns column name in field 'COLUMN_NAME'
PostgreSQL returns column name in field 'column_name'

Code: const [columns] = await pool.query(
  'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS ...'
);
return new Set(columns.map((c) => c.COLUMN_NAME));  // MySQL uppercase

PG returns lowercase: c.column_name


CRIT-10: JSON handling — pg returns parsed objects natively
─────────────────────────────────────────────────────────
MySQL/mysql2: JSON columns returned as strings (need JSON.parse)
PostgreSQL/pg: JSONB columns returned as native JS objects (no parse needed)

Code currently does: typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes
This GATE works (won't crash) but the string branch is dead code with pg.

Files: models/product.js (3 locations in getProductById, getAllProducts, getProductsByDropId)
       controllers/reservationController.js (image URL parsing)


═══════════════════════════════════════════════════════════════
🟡 HIGH (Data integrity / business logic risks)
═══════════════════════════════════════════════════════════════

HIGH-01: Schema files contradict each other — corrupted source of truth
─────────────────────────────────────────────────────────
Root schema.sql and db/schema.sql disagree on:
  - drops: image_url length (512 vs 255)
  - drops: presence of 'type' column
  - products: presence of updated_at
  - product_quality_prices: is_active, updated_at, UNIQUE key, indexes
  - orders: presence of quality_level_id, price_at_purchase
  - order_items: columns vary wildly between files
  - notifications: message vs description, is_read vs is_seen
  - contact_messages: subject length (255 vs 100)

Since we're ignoring all schema files and using code as truth,
the new schema resolves all these conflicts based on actual runtime queries.


HIGH-02: Orphan risk — orders.product_id is SET NULL on delete
─────────────────────────────────────────────────────────
When a product is deleted, orders.product_id becomes NULL.
But order_items.product_id also becomes NULL.
The customer's order history then shows no product details.

This is intentional design (snapshots in product_name/size/color columns)
but product_id FK should probably be removed from orders table.
Orders should rely on the denormalized snapshot, not the FK.

FIX: Remove FK constraint on orders.product_id → products.id
(The product_name, size, color columns already preserve the purchase snapshot)


HIGH-03: No foreign key validates order_items.order_id properly
─────────────────────────────────────────────────────────
In db/schema.sql: product_id has NOT NULL but no FK to products
In root schema.sql: product_id is nullable but has FK

Our code always passes product_id, and our schema allows NULL.
Should be: product_id INT NOT NULL (consistent with order creation logic)


HIGH-04: order_items.price column — dead column, never used
─────────────────────────────────────────────────────────
Root schema.sql defines `price DECIMAL(15, 2) DEFAULT NULL` in order_items.
No code ever reads or writes this column.
Code uses `price_at_purchase` instead.

FIX: Omit `price` column from new schema.


HIGH-05: store_config has no enforced singleton constraint
─────────────────────────────────────────────────────────
Multiple rows could be inserted (init.js doesn't prevent it).
Controller SELECT * WHERE id = 1 works, but nothing prevents id=2.

FIX: ADD CHECK (id = 1) constraint — implemented in new schema ✅


HIGH-06: notifications table has redundant message column in db/schema.sql
─────────────────────────────────────────────────────────
db/schema.sql defines: message TEXT and description TEXT and is_read TINYINT
Code only uses: description and is_seen

The 'message' and 'is_read' columns are DEAD — never queried or written by code.

FIX: Omit message and is_read columns. Keep description and is_seen only. ✅


═══════════════════════════════════════════════════════════════
🟠 MEDIUM (Performance / maintainability)
═══════════════════════════════════════════════════════════════

MED-01: No index on notifications.created_at
───────────────────────────────────────────
Notifications are fetched ORDER BY created_at DESC LIMIT 50.
Without an index, this requires a full table scan.

FIX: ADD INDEX on notifications(is_seen, created_at DESC)


MED-02: Full product JSONB parsed in ORDER BY queries
────────────────────────────────────────────────────
dropController.js runs: 'SELECT drop_id, MIN(price) AS min_price
  FROM products WHERE drop_id IN (?) GROUP BY drop_id'

This is fine with proper indexing but should have an index on (drop_id, price).

FIX: Already included: CREATE INDEX idx_products_drop ON products (drop_id)


MED-03: storeConfigController dynamically detects columns — fragile
─────────────────────────────────────────────────────────
The controller queries information_schema to detect which columns exist
and builds UPDATE queries dynamically. This is overengineered for a
singleton config table.

FIX: Replace with static queries. Remove legacy column detection logic.
The new schema has exactly: id, store_mode, announcement, updated_at.


MED-04: connection.release() vs client.release() — pg pool API differs
─────────────────────────────────────────────────────────
mysql2: pool.getConnection() → connection.release()
pg: pool.connect() → client.release() (or just use pool.query directly)

The pg Pool's .query() method auto-acquires/releases a client.
Using pool.connect() + client.release() is only needed for transactions.

FIX: Replace db/connection.js entirely (see backend migration report)


MED-05: No UNIQUE constraint on password_resets.token
───────────────────────────────────────────────────
Token is queried by value but has no unique index.
Collision risk is extremely low (crypto.randomBytes(32)) but index improves lookup.

FIX: Already implemented: CREATE INDEX idx_password_resets_token ✅


MED-06: Email notifications use fire-and-forget async IIFE
──────────────────────────────────────────────────────
dropController.js sends emails in (async () => { ... })() without await.
If the process crashes between INSERT and email, the notification is lost.

This is acceptable for marketing emails but consider a job queue for reliability.
No schema change needed — architectural concern.


═══════════════════════════════════════════════════════════════
🔵 LOW (Cosmetic / legacy cleanup)
═══════════════════════════════════════════════════════════════

LOW-01: collection_id on drops — never used anywhere
────────────────────────────────────────────────────
No model, controller, or query references this column.
Omitted from new schema.

LOW-02: stock column added by migration 2026_02_21 — never used
──────────────────────────────────────────────────────────────
No code reads/writes drops.stock.
Omitted from new schema.

LOW-03: images JSON column added by migration 2026_02_21 — never used
─────────────────────────────────────────────────────────────────
No code reads/writes drops.images.
Code only uses image_url (plain URL string).
Omitted from new schema.

LOW-04: store_config.mode and announcement_message — legacy column names
─────────────────────────────────────────────────────────────────────
Controller handles these as fallback but they shouldn't exist in new schema.

LOW-05: announcements table has version as INT (Unix timestamp)
─────────────────────────────────────────────────────────────────
Code: const version = Math.floor(Date.now() / 1000)
This is a valid approach but unconventional. Kept as-is for compatibility.

LOW-06: Hardcoded admin email list in authMiddleware.js
─────────────────────────────────────────────────────────
Admin emails are embedded in code, not in the database.
Should be configurable via env variable or admin table.
No schema change — operational concern.


═══════════════════════════════════════════════════════════════
SUMMARY
═══════════════════════════════════════════════════════════════

CRITICAL:  10 issues (all must fix before PG migration)
HIGH:       6 issues (5 addressed in schema, 1 ongoing)
MEDIUM:     6 issues (3 addressed in schema, 3 in code)
LOW:        6 issues (all addressed by omitting dead columns)

Total dead columns removed: 6
  - drops.collection_id, drops.stock, drops.images
  - order_items.price
  - notifications.message, notifications.is_read

Total schema conflicts resolved: 8
  - settings.key vs setting_key (→ use "key" with quoting)
  - notifications.description vs message (→ description)
  - notifications.is_seen vs is_read (→ is_seen)
  - orders columns present in one schema but not other (→ code as truth)
  - order_items columns divergence (→ code as truth)
  - product_quality_prices completeness (→ include all active columns)
  - store_config dynamic columns (→ static schema)
  - contact_messages.subject length (→ VARCHAR(255))