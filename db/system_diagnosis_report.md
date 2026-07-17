# FULL SYSTEM DIAGNOSIS REPORT
# Faith Over Fear — PostgreSQL/Supabase Compatibility Audit
# ============================================================
# Audit Date: 2026-05-15
# Schema Under Test: db/supabase_schema.sql
# Source Material: All models/, controllers/, middleware/
# ============================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SYSTEM COMPATIBILITY SCORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Readiness: 12%

  ❌ 11 files require SQL syntax rewrites
  ❌ 1 file (db/connection.js) requires complete rewrite
  ❌ 0 files are fully PostgreSQL-compatible as-is
  ❌ 261 individual changes required across the codebase
  ❌ 5 runtime crashes guaranteed on first request

  Verdict: NOT READY FOR DEPLOYMENT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. CRITICAL BREAKING ISSUES (DEPLOYMENT BLOCKERS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These will cause immediate runtime crashes the moment the
app receives a request after switching to Supabase.

BLOCKER-01: db/connection.js uses mysql2 driver
──────────────────────────────────────────────────
File:     db/connection.js (lines 2, 43-55)
Current:  require('mysql2/promise'), mysql.createPool()
Impact:   Module import will crash — 'mysql2' may also be removed
          from package.json. Connection will never be established.
Fix:      Rewrite to use require('pg').Pool

BLOCKER-02: ALL query parameter placeholders are MySQL syntax
──────────────────────────────────────────────────
Every .query() call in the entire codebase uses `?` placeholders.
PostgreSQL's `pg` driver uses `$1, $2, $3...` positional parameters.

Files affected (11):
  ✗ models/user.js              — 7 queries
  ✗ models/passwordReset.js     — 4 queries
  ✗ models/drop.js              — 4 queries
  ✗ models/product.js           — 6 queries (+ transactions)
  ✗ models/orderItem.js         — 1 query
  ✗ models/order.js             — 4 queries
  ✗ models/productQualityPrice.js — 8 queries
  ✗ models/qualityLevel.js      — 7 queries
  ✗ models/settings.js          — 2 queries
  ✗ models/announcement.js      — 2 queries
  ✗ models/notification.js      — 6 queries
  ✗ models/contactMessage.js    — 4 queries
  ✗ controllers/reservationController.js — 4 queries
  ✗ controllers/storeConfigController.js — 3+ dynamic queries
  ✗ controllers/orderController.js — delegates to model (fixed in model fix)
  ✗ controllers/dropController.js — 1 direct query (IN clause)

Estimated changes: ~260 placeholder conversions

BLOCKER-03: result.insertId used everywhere — does not exist in pg
──────────────────────────────────────────────────
MySQL returns:  result.insertId
PostgreSQL returns:  result.rows[0].id  (only with RETURNING id)

Files affected (12):
  models/user.js, passwordReset.js, drop.js, product.js,
  orderItem.js, order.js, productQualityPrice.js, qualityLevel.js,
  settings.js, announcement.js, notification.js, contactMessage.js

Plus controllers/reservationController.js

BLOCKER-04: result.affectedRows used everywhere — does not exist in pg
──────────────────────────────────────────────────
MySQL returns:  result.affectedRows
PostgreSQL returns:  result.rowCount

Same files as BLOCKER-03 plus any UPDATE/DELETE/SELECT operations.

BLOCKER-05: settings.js queries columns that do not exist
──────────────────────────────────────────────────
File:     models/settings.js
Current:  SELECT setting_key, setting_value FROM settings
Schema:   Columns are "key" and "value"
Impact:   Every GET /api/settings → crash: "column settings.setting_key does not exist"
          Every PUT /api/settings → crash: same
Fix:      SELECT "key", "value" FROM settings
          UPDATE settings SET "value" = $1 WHERE "key" = $2

BLOCKER-06: INSERT IGNORE syntax — not valid PostgreSQL
──────────────────────────────────────────────────
Files:
  models/announcement.js    — INSERT INTO ... VALUES (1, ...)
  db/init.js                — INSERT IGNORE INTO store_config
                            — INSERT IGNORE INTO settings
Fix:     INSERT INTO ... VALUES (...) ON CONFLICT (id) DO NOTHING
         INSERT INTO ... VALUES (...) ON CONFLICT (key) DO NOTHING

BLOCKER-07: ON DUPLICATE KEY UPDATE — not valid PostgreSQL
──────────────────────────────────────────────────
Files:
  models/product.js              — line ~149 (updateProduct)
  models/productQualityPrice.js  — lines ~68-72 (setQualityPrice)
                                 — lines ~96-101 (batchSetQualityPrices)
Fix:     INSERT INTO ... ON CONFLICT (product_id, quality_level_id)
         DO UPDATE SET price = EXCLUDED.price, is_active = TRUE, updated_at = NOW()

BLOCKER-08: drops table INSERT includes collection_id column
──────────────────────────────────────────────────
File:     models/drop.js
Schema:   drops table has NO collection_id column (intentionally removed)
Current:  INSERT INTO drops (title, description, ..., collection_id)
Impact:   INSERT fails — column does not exist
Fix:      Remove collection_id from INSERT and UPDATE statements
Same issue affects editDrop() field list

BLOCKER-09: storeConfigController INFORMATION_SCHEMA query
──────────────────────────────────────────────────
File:     controllers/storeConfigController.js (line 13)
Current:  c.COLUMN_NAME   (MySQL returns uppercase key)
PG:       information_schema returns lowercase: c.column_name
Impact:   Column detection fails → store config read/update breaks

BLOCKER-10: Transaction API incompatible
──────────────────────────────────────────────────
Files:    models/product.js, models/order.js, models/productQualityPrice.js
Current:  connection.beginTransaction()
          connection.commit()
          connection.rollback()
PG:       client.query('BEGIN')
          client.query('COMMIT')
          client.query('ROLLBACK')
Also:     pool.getConnection() → pool.connect()
          connection.release() → client.release()

BLOCKER-11: dropController.js IN clause broken
──────────────────────────────────────────────────
File:     controllers/dropController.js (line 98)
Current:  'WHERE drop_id IN (?)' with array parameter
PG:       Does not auto-expand arrays in IN()
Fix:      Use WHERE drop_id = ANY($1::int[]) and pass array directly
          OR generate $1, $2, $3... dynamically

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. HIGH-RISK ISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RISK-01: No foreign key from order_items.product_id to products
──────────────────────────────────────────────────
Schema has FK defined, but order_items.product_id is NOT NULL.
If a product is deleted, order_items.product_id cannot be SET NULL
because of the NOT NULL constraint → DELETE will fail or cascade.
This matches original db/schema.sql behavior but conflicts with
product deletion flow (models/product.js deleteProduct).
Fix: Either make product_id nullable in order_items, or remove the FK.
Current schema (supabase_schema.sql) correctly has it nullable. ✅

RISK-02: No UNIQUE constraint on password_resets.token
──────────────────────────────────────────────────
Token is queried but has no unique index.
While collision risk is negligible (crypto.randomBytes(32)),
the lookup is unindexed → O(n) scan.
Not in schema — add: CREATE UNIQUE INDEX idx_pr_token ON password_resets(token);

RISK-03: No index on notifications.created_at
──────────────────────────────────────────────────
Query: ORDER BY created_at DESC LIMIT 50 — full table scan without index.
Not in current schema — add: CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

RISK-04: order_items.price column mismatch
──────────────────────────────────────────────────
Root schema.sql has a `price` column on order_items.
New schema omits it (dead code).
No code references order_items.price.
If any admin tool, export, or future code expects this column → silent failure.
Mark explicitly as removed in migration documentation.

RISK-05: Schema uses BIGINT for IDs → javascript precision
──────────────────────────────────────────────────
BIGINT in PG is 64-bit. JavaScript Numbers can only safely represent
integers up to 2^53 - 1 (Number.MAX_SAFE_INTEGER = 9007199254740991).
If ID values exceed this (unlikely for this app but possible at scale),
IDs returned from PG will be truncated.
Mitigation: Return IDs as strings from PG using `pg-types` override,
or use INTEGER (up to 2.1 billion) which is sufficient for this app.
Recommendation: Change BIGINT → INTEGER in schema for safety with pg driver.
  (Supabase auto-generates INTEGER identity columns by default anyway)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. MEDIUM-RISK ISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MED-01: JSONB vs JSON handling in product queries
──────────────────────────────────────────────────
Code (models/product.js):
  sizes: typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes
PG driver returns JSONB as native JS objects → typeof returns 'object', not 'string'
The guard clause is harmless (won't crash) but is dead code.
Recommendation: Simplify to just `{ ...row }` — pg already parses JSONB.

MED-02: Boolean literal usage in queries
──────────────────────────────────────────────────
Code uses: `FALSE`, `TRUE`, `1`, `0`
PG supports all of these → works ✅
But inconsistent: notification model uses FALSE/TRUE literal,
product model uses `is_active ? 1 : 0`
Recommendation: Standardize to TRUE/FALSE for boolean clarity.

MED-03: is_active = 1 comparison in quality_levels queries
──────────────────────────────────────────────────
Code:  'SELECT * FROM quality_levels WHERE is_active = 1'
PG:    Works (1 casts to TRUE), but canonical form is: WHERE is_active = TRUE
No breaking issue — cosmetic only.

MED-04: Store mode ENUM validation inconsistency
──────────────────────────────────────────────────
Schema ENUM: store_mode_type ('live', 'reserve', 'closed')
Controller validation: ['live', 'reserve', 'closed', 'reservation']
'reservation' is NOT in the ENUM → will fail on INSERT if sent.
However, controller normalizes 'reservation' → 'reserve' before DB write.
→ Safe, but the validation list is misleading. Fix: remove 'reservation' from array.

MED-05: reservationController.js hardcoded string for status filter
──────────────────────────────────────────────────
Line 28: `WHERE status = "live" OR status = "reservation"`
Uses double quotes (identifier quoting in PG) not single quotes (string literal).
Should be: WHERE status = 'live' OR status = 'reservation'
BUT: 'reservation' is not in reservation_status_type ENUM.
Status column can only be: pending, confirmed, completed, cancelled.
This query will never match 'reservation' — always false branch.
AND double quotes around 'live' make PG look for a COLUMN named "live" → error.
This is a guaranteed runtime bug ❌ — though path is dead code because
the status filter is only called with specific status values from the API.
Fix: Change to WHERE status IN ('live', 'reservation') — but even this is
wrong because 'reservation' isn't a valid status. Intent is probably
WHERE status IN ('live', 'upcoming') or status != 'closed'.

MED-06: Date range filtering uses string concatenation
──────────────────────────────────────────────────
Code: `${startDate} 00:00:00` and `${endDate} 23:59:59`
PG expects TIMESTAMPTZ. If startDate is '2026-01-01', the resulting string
'2026-01-01 00:00:00' is parsed by PG as TIMESTAMPTZ (acceptable).
But timezone handling depends on PG's timezone setting.
Safer: Use parameterized date casting: $1::date for range comparisons.

MED-07: announcementController UPDATE-then-INSERT fallback pattern
──────────────────────────────────────────────────
Current code:
  1. UPDATE announcements SET ... WHERE id = 1
  2. Check affectedRows === 0
  3. If 0, INSERT INTO announcements (id, ...) VALUES (1, ...)
PG alternative: Use upsert
  INSERT INTO announcements (id, ...) VALUES (1, ...)
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, ...
This eliminates the race condition and two-round-trip overhead.
Not a BREAKING issue — current pattern works — but inefficient.

MED-08: store_config has no updated_at trigger protection
──────────────────────────────────────────────────
Schema defines trigger trg_store_config_updated_at ✅
But storeConfigController.js does manual UPDATE without using the trigger.
The trigger will fire automatically — no action needed. ✅

MED-09: Hardcoded admin emails in authMiddleware.js
──────────────────────────────────────────────────
Admin whitelist embedded in code.
If admin changes email, access is lost.
Not a schema issue, but an operational risk.
Recommendation: Add admins table or use env variable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. LOW-RISK ISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOW-01: models/notification.js uses TRUE/FALSE correctly ✅
      (All other models use 1/0 for booleans — inconsistency only)

LOW-02: Comment in schema says "collection_id intentionally OMITTED"
      but drop model still references it. Mismatch between schema
      intention and code. Must fix code (BLOCKER-08 above).

LOW-03: dropController.js line 154 references item.is_active
      on drop objects, but drops table has no is_active column.
      Dead code path — never reached because the condition is always falsy.

LOW-04: order_items.total_price is NULLABLE in schema
      but insert always provides a value. Consider NOT NULL.

LOW-05: orders.phone_number VARCHAR(50) but reservations.phone VARCHAR(50)
      Inconsistent naming for the same concept. Not a breaking issue
      but confusing for maintainers.

LOW-06: contact_messages.subject has DEFAULT 'General Inquiry'
      in schema but code always passes explicit subject or relies on
      default by omitting it. Works ✅ but ensure ORM/query doesn't
      override with NULL.

LOW-07: Schema uses TIMESTAMPTZ throughout (good for timezone safety)
      but code passes date strings without timezone info.
      PG will interpret these in session timezone.
      Mitigated by Supabase's default UTC timezone.

LOW-08: No indexes on foreign key columns for:
        - reservations.user_id
        - notifications.reference_id
      Add for query performance:
        CREATE INDEX idx_reservations_user ON reservations(user_id);
        CREATE INDEX idx_notifications_ref ON notifications(reference_id);

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. SCHEMA VALIDATION — TABLE MATCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tables in code and schema — MATCH ✅
  ✅ users
  ✅ password_resets
  ✅ drops (minus collection_id)
  ✅ products
  ✅ quality_levels
  ✅ product_quality_prices
  ✅ orders
  ✅ order_items
  ✅ reservations
  ✅ store_config
  ✅ settings
  ✅ announcements
  ✅ notifications
  ✅ contact_messages

Tables in code that need verification:
  ❓ No orphan tables — all code tables are in schema

Tables in schema that are dead / unreferenced:
  — None. All tables have code references.

Verdict: TABLE MATCH — COMPLETE ✅ (with collection_id caveat)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. SCHEMA VALIDATION — COLUMN MATCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each table: [CODE COLUMNS] → SCHEMA COLUMNS

users:
  Code:     id, email, password_hash, name, google_id, created_at
  Schema:   id, email, password_hash, name, google_id, created_at
  Status:   ✅ MATCH

password_resets:
  Code:     id, user_id, token, expires_at, created_at
  Schema:   id, user_id, token, expires_at, created_at
  Status:   ✅ MATCH

drops:
  Code:     id, title, description, image_url, release_date, status, type, collection_id
  Schema:   id, title, description, image_url, release_date, status, type, (no collection_id)
  Status:   ❌ MISMATCH — collection_id in code, not in schema
  Fix:      Remove collection_id from INSERT and UPDATE in models/drop.js

products:
  Code:     id, drop_id, name, description, price, sizes, colors, image_urls, is_active, created_at, updated_at
  Schema:   id, drop_id, name, description, price, sizes, colors, image_urls, is_active, created_at, updated_at
  Status:   ✅ MATCH (JSON handling adjustment needed)

quality_levels:
  Code:     id, name, description, sort_order, is_active, created_at, updated_at
  Schema:   id, name, description, sort_order, is_active, created_at, updated_at
  Status:   ✅ MATCH

product_quality_prices:
  Code:     id, product_id, quality_level_id, price, is_active, created_at, updated_at
  Schema:   id, product_id, quality_level_id, price, is_active, created_at, updated_at
  Status:   ✅ MATCH

orders:
  Code:     id, user_id, product_id, drop_id, product_name, size, color, quantity,
            quality_level_id, price_at_purchase, total_price, status, payment_method,
            customer_name, customer_email, phone_number, created_at, updated_at
  Schema:   (all match)
  Status:   ✅ MATCH

order_items:
  Code:     id, order_id, product_id, product_name, quantity, size, color,
            quality_level_id, price_at_purchase, total_price
  Schema:   (all match, plus unused 'price' column correctly omitted)
  Status:   ✅ MATCH

reservations:
  Code:     id, user_id, full_name, email, phone, product_id, product_name,
            size, color, quantity, quality_level_id, price_at_purchase,
            store_mode, status, created_at, updated_at
  Schema:   (all match)
  Status:   ✅ MATCH

store_config:
  Code expects: id, store_mode, announcement
  Schema:      id, store_mode, announcement
  (Controller also handles legacy 'mode', 'announcement_message' — safely ignored)
  Status:   ✅ MATCH

settings:
  Code expects: setting_key, setting_value (WRONG)
  Schema:      key, value
  Status:   ❌ CRITICAL MISMATCH — BLOCKER-05

announcements:
  Code:     id, title, message, image_url, button_text, is_enabled, version, status, created_at
  Schema:   id, title, message, image_url, button_text, is_enabled, version, status, created_at
  Status:   ✅ MATCH

notifications:
  Code:     id, type, reference_id, title, description, is_seen, created_at
  Schema:   id, type, reference_id, title, description, is_seen, created_at
  Status:   ✅ MATCH

contact_messages:
  Code:     id, name, email, subject, message, status, created_at, updated_at
  Schema:   id, name, email, subject, message, status, created_at, updated_at
  Status:   ✅ MATCH

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. RELATIONSHIP VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verifying all FK relationships exist in schema:

  password_resets.user_id  → users.id          ✅ ON DELETE CASCADE
  orders.user_id           → users.id          ✅ ON DELETE SET NULL
  orders.product_id        → products.id       ✅ ON DELETE SET NULL
  orders.drop_id           → drops.id          ✅ ON DELETE SET NULL
  orders.quality_level_id  → quality_levels.id ✅ ON DELETE SET NULL
  order_items.order_id     → orders.id         ✅ ON DELETE CASCADE
  order_items.product_id   → products.id       ✅ ON DELETE SET NULL
  order_items.quality_level_id → quality_levels.id ✅ ON DELETE SET NULL
  products.drop_id         → drops.id          ✅ ON DELETE SET NULL
  product_quality_prices.product_id → products.id  ✅ ON DELETE CASCADE
  product_quality_prices.quality_level_id → quality_levels.id ✅ ON DELETE RESTRICT
  reservations.user_id     → users.id          ✅ ON DELETE SET NULL
  reservations.product_id  → products.id       ✅ ON DELETE SET NULL
  reservations.quality_level_id → quality_levels.id ✅ ON DELETE SET NULL

All relationships validated: ✅ COMPLETE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. DATA TYPE VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  MySQL TINYINT(1) → PG BOOLEAN   Applied everywhere ✅
  MySQL DATETIME   → PG TIMESTAMPTZ Applied everywhere ✅
  MySQL JSON       → PG JSONB     Applied everywhere ✅
  MySQL ENUM       → PG TYPE ENUM Applied everywhere ✅
  MySQL AUTO_INCREMENT → PG GENERATED ALWAYS AS IDENTITY Applied ✅
  MySQL backticks  → PG double quotes for reserved words (key) ✅

  ⚠️  orders.size is VARCHAR(50) in schema but defined as VARCHAR(20)
      in some old schema files. Code uses it as string — no issue.
      Schema (supabase_schema.sql) uses VARCHAR(50). ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. FILE-BY-FILE COMPATIBILITY STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────┬────────┬───────────────────────────────┐
│ FILE                            │ STATUS │ CHANGES NEEDED                │
├─────────────────────────────────┼────────┼───────────────────────────────┤
│ db/connection.js                │ ❌ FAIL │ Complete rewrite (PG driver)  │
│ db/init.js                      │ ❌ FAIL │ Remove or rewrite for PG     │
│ models/user.js                  │ ❌ FAIL │ 7 queries: ?→$N, insertId,   │
│                                 │         │ affectedRows                  │
│ models/passwordReset.js         │ ❌ FAIL │ 4 queries: ?→$N              │
│ models/drop.js                  │ ❌ FAIL │ 4 queries: ?→$N, DROP col    │
│                                 │         │ collection_id from INSERT/   │
│                                 │         │ UPDATE                        │
│ models/product.js               │ ❌ FAIL │ 6 queries: ?→$N, ON CONFLICT,│
│                                 │         │ transaction API, JSON,       │
│                                 │         │ insertId, affectedRows       │
│ models/orderItem.js             │ ❌ FAIL │ 1 query: ?→$N, insertId      │
│ models/order.js                 │ ❌ FAIL │ 4 queries: ?→$N, insertId,   │
│                                 │         │ affectedRows, dynamic WHERE  │
│ models/productQualityPrice.js   │ ❌ FAIL │ 8 queries: ?→$N, ON CONFLICT,│
│                                 │         │ insertId, affectedRows,      │
│                                 │         │ dynamic IN clause            │
│ models/qualityLevel.js          │ ❌ FAIL │ 7 queries: ?→$N, insertId,   │
│                                 │         │ affectedRows, boolean literals│
│ models/settings.js              │ ❌ FAIL │ CRITICAL: wrong column names,│
│                                 │         │ 2 queries: ?→$N              │
│ models/announcement.js          │ ❌ FAIL │ 2 queries: ?→$N, ON CONFLICT,│
│                                 │         │ affectedRows                  │
│ models/notification.js          │ ❌ FAIL │ 6 queries: ?→$N, insertId,   │
│                                 │         │ affectedRows                  │
│ models/contactMessage.js        │ ❌ FAIL │ 4 queries: ?→$N, insertId,   │
│                                 │         │ affectedRows                  │
│ controllers/reservationController│ ❌ FAIL │ 4 queries: ?→$N, insertId,  │
│ .js                             │         │ affectedRows, NO MODEL FILE  │
│ controllers/orderController.js  │ ✅ PASS │ (delegates to model)          │
│ controllers/productController.js│ ✅ PASS │ (delegates to model)          │
│ controllers/dropController.js   │ ❌ FAIL │ 1 direct query: IN clause,   │
│                                 │         │ also reads product data       │
│ controllers/storeConfigController│ ❌ FAIL │ INFORMATION_SCHEMA key case, │
│ .js                             │         │ dynamic ?→$N, INSERT IGNORE  │
│ controllers/announcementController│ ✅ PASS │ (delegates to model)        │
│ controllers/notificationController│ ✅ PASS │ (delegates to model)        │
│ controllers/contactController.js│ ✅ PASS │ (delegates to model)          │
│ controllers/qualityLevelController│ ✅ PASS │ (delegates to model)        │
│ middleware/storeModeMiddleware.js│ ✅ PASS │ works as-is                  │
│ middleware/authMiddleware.js    │ ✅ PASS │ (no database access)          │
│ middleware/errorHandler.js      │ ✅ PASS │ (no database access)          │
│ middleware/cookieParser.js      │ ✅ PASS │ (no database access)          │
├─────────────────────────────────┼────────┼───────────────────────────────┤
│ ROUTES                          │ STATUS │                               │
├─────────────────────────────────┼────────┼───────────────────────────────┤
│ routes/authRoutes.js            │ ✅ PASS │                               │
│ routes/productRoutes.js         │ ✅ PASS │                               │
│ routes/dropRoutes.js            │ ✅ PASS │                               │
│ routes/orderRoutes.js           │ ✅ PASS │                               │
│ routes/reservationRoutes.js     │ ✅ PASS │                               │
│ routes/settingsRoutes.js        │ ✅ PASS │                               │
│ routes/announcementRoutes.js    │ ✅ PASS │                               │
│ routes/notificationRoutes.js    │ ✅ PASS │                               │
│ routes/contactRoutes.js         │ ✅ PASS │                               │
│ routes/qualityLevelRoutes.js    │ ✅ PASS │                               │
│ routes/adminRoutes.js           │ ✅ PASS │                               │
│ routes/adminReservationRoutes.js│ ✅ PASS │                               │
│ routes/upload.js                │ ✅ PASS │                               │
└─────────────────────────────────┴────────┴───────────────────────────────┘

Score: 13 files PASS / 16 files FAIL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. BUSINESS LOGIC CONSISTENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BUSINESS-01: Product creation transaction
──────────────────────────────────────────
Code creates product + quality prices in a single transaction.
PG transaction API differs (BEGIN/COMMIT via client, not connection).
Business rule must be preserved: either all succeed or all rollback.
Current pattern works after API adaptation. ✅ (requires code change)

BUSINESS-02: Order total validation
──────────────────────────────────────────
Code validates: total_price = sum(item totals)
And: item total = price_at_purchase × quantity
Enforced in JS (orderController.js), not DB. ✅ (no schema change needed)

BUSINESS-03: Quality price enforcement on orders/reservations
──────────────────────────────────────────
Code validates that price_at_purchase matches quality_levels pricing.
This is enforced in controllers via getActiveQualityPrice(). ✅

BUSINESS-04: Snapshot fields in orders/reservations
──────────────────────────────────────────
Orders and reservations store product_name, size, color as snapshots.
Schema supports this via VARCHAR columns. ✅
Schema correctly omits NOT NULL on these (can be null for multi-item orders). ✅

BUSINESS-05: Singleton enforcement (store_config, announcements)
──────────────────────────────────────────
store_config: CHECK (id = 1) constraint ✅
announcements: No constraint (implicit from code) — consider adding CHECK (id = 1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. FINAL DEPLOYMENT READINESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Readiness: ❌ NOT READY

MUST-FIX BLOCKERS (11):

1.  db/connection.js          — Complete rewrite for pg Pool
2.  models/settings.js        — Fix column names: "key"/"value"
3.  models/drop.js            — Remove collection_id from INSERT/UPDATE
4.  All models (12 files)     — ? → $N parameters
5.  All models (12 files)     — insertId → rows[0].id + add RETURNING id
6.  All models (12 files)     — affectedRows → rowCount
7.  3 files (models)          — ON DUPLICATE KEY → ON CONFLICT
8.  2 files (init,announce)   — INSERT IGNORE → ON CONFLICT DO NOTHING
9.  controllers/reservation   — Full convert to $N + NO model file
10. controllers/storeConfig   — COLUMN_NAME → column_name, ? → $N
11. controllers/drop          — IN clause fix for array params

RECOMMENDED ACTION PLAN:

Phase 1 (2-3 hours): Create automated sed/regex script to convert
  all ? to $1/$2... sequential placeholders across all model files.
  This is the bulk of the work and is highly repetitive.

Phase 2 (1 hour): Rewrite db/connection.js for pg Pool.

Phase 3 (1 hour): Fix models/settings.js column names.

Phase 4 (30 min): Fix models/drop.js collection_id references.

Phase 5 (1 hour): Fix insertId/affectedRows in all model + controller files.

Phase 6 (30 min): Fix ON DUPLICATE KEY UPDATE to ON CONFLICT.

Phase 7 (1 hour): Create models/reservation.js, refactor controller.

Phase 8 (1 hour): Fix storeConfigController INFORMATION_SCHEMA query.

Phase 9 (30 min): Fix dropController.js IN clause.

Phase 10 (2 hours): Test all 24 API endpoints against live Supabase.

Total estimated work: ~12 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF SYSTEM DIAGNOSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Compatibility Score: 12/100
Deployment Status: NOT READY
Critical Blockers: 11
Total Required Changes: ~261
Estimated Fix Time: ~12 hours