# BACKEND MIGRATION REPORT
# Faith Over Fear — MySQL → PostgreSQL (Supabase) Migration
# Complete file-by-file changelog
# ============================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1: PACKAGE CHANGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REMOVE:
  "mysql2": "^3.20.0"           ← MySQL driver, not compatible with PG

KEEP/UPDATE:
  "pg": "^8.20.0"               ← Already in package.json! (may have been added for another feature)
                                  Ensure this is the primary DB driver.

ADD (recommended):
  "dotenv": "^17.4.1"           ← Already present ✅
  "pg-format" or "sqlstring"    ← Optional: for ? placeholder conversion if needed

Updated package.json should look like:
```json
{
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cloudinary": "^2.9.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^17.4.1",
    "express": "^5.2.1",
    "google-auth-library": "^10.6.2",
    "jsonwebtoken": "^9.0.3",
    "multer": "^2.1.1",
    "nodemailer": "^8.0.4",
    "pg": "^8.20.0",
    "resend": "^6.10.0"
  }
}
```

⚠️  After removing mysql2, the `require('mysql2/promise')` in db/connection.js
    will crash. This file MUST be rewritten (see below).


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2: ENVIRONMENT VARIABLE CHANGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OLD (.env) — MySQL on Railway:
━━━━━━━━━━━
DB_HOST=mysql.railway.internal
DB_USER=root
DB_PASSWORD=seNmizJDJaBujvNCkeakcSnWSMTwFhgk
DB_NAME=railway
DB_PORT=3306

NEW (.env) — Supabase PostgreSQL:
━━━━━━━━━━━
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
# Or separate env vars:
DB_HOST=db.[YOUR-PROJECT-REF].supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=[YOUR-PASSWORD]
DB_NAME=postgres
DATABASE_URL_DIRECT=[connection string with ?pgbouncer=false for direct access]

# Remove DB_PORT=3306 — PostgreSQL uses 5432
# Remove MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3: FILE-BY-FILE CODE CHANGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─────────────────────────────────────────────────────────────
FILE: db/connection.js ← REWRITE ENTIRELY
─────────────────────────────────────────────────────────────

CURRENT: Uses mysql2/promise with MYSQL* env vars
REPLACE WITH:

```javascript
// db/connection.js
const { Pool } = require('pg');

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

async function verifyConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection verified');
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
}

module.exports = { pool, verifyConnection };
```

NOTE: Supabase requires `?pgbouncer=false` in the DATABASE_URL for direct
access (transactions, prepared statements). Use the DIRECT connection string.


─────────────────────────────────────────────────────────────
FILE: db/init.js ← REWRITE FOR PG COMPATIBILITY
─────────────────────────────────────────────────────────────

CURRENT: Creates tables using MySQL syntax + runs migrations inline
NEW APPROACH:

Option A (Recommended): Use Supabase migrations instead of init.js.
  - Remove db/init.js entirely
  - Use `supabase db diff` or manual SQL migration files in supabase/migrations/

Option B (Keep init.js for backwards compat):
  Replace all MySQL syntax with PG syntax:
  - Remove ENGINE, CHARSET, AUTO_INCREMENT
  - Change ? to $1, $2...
  - Change INSERT IGNORE to ON CONFLICT DO NOTHING
  - Change SHOW COLUMNS to information_schema.columns
  - Change result.insertId to result.rows[0].id
  - Change result.affectedRows to result.rowCount

The migration_2026_02_21.sql and migration_2026_02_25_products.sql files
should be IGNORED — their changes (stock column, images column, collection_id)
are dead code and not present in our new schema.


─────────────────────────────────────────────────────────────
FILE: models/user.js
─────────────────────────────────────────────────────────────

Line 7:  'INSERT INTO users (email, password_hash, name, google_id) VALUES (?, ?, ?, ?)'
         → 'INSERT INTO users (email, password_hash, name, google_id) VALUES ($1, $2, $3, $4) RETURNING id'
Line 9:  return result.insertId
         → return result.rows[0].id

Line 13: 'SELECT * FROM users WHERE email = ?'
         → 'SELECT * FROM users WHERE email = $1'

Line 18: 'SELECT * FROM users WHERE id = ?'
         → 'SELECT * FROM users WHERE id = $1'

Line 23: 'SELECT * FROM users WHERE google_id = ?'
         → 'SELECT * FROM users WHERE google_id = $1'

Line 29: 'UPDATE users SET password_hash = ? WHERE id = ?'
         → 'UPDATE users SET password_hash = $1 WHERE id = $2'
Line 30: return result.affectedRows > 0
         → return result.rowCount > 0

Line 37-44: SELECT DISTINCT email → no placeholder changes, works already ✅

Line 49: 'UPDATE users SET google_id = ? WHERE id = ?'
         → 'UPDATE users SET google_id = $1 WHERE id = $2'
Line 50: return result.affectedRows > 0
         → return result.rowCount > 0


─────────────────────────────────────────────────────────────
FILE: models/passwordReset.js
─────────────────────────────────────────────────────────────

Line 5:  'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)'
         → Values ($1, $2, $3) RETURNING id
Line 6:  return result.insertId → return result.rows[0].id

Line 12: 'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()'
         → $1 (now() also works in PG)

Line 19: 'DELETE FROM password_resets WHERE token = ?'
Line 24: 'DELETE FROM password_resets WHERE user_id = ?'
         → Change ? to $1
Lines 20, 25: result.affectedRows → result.rowCount


─────────────────────────────────────────────────────────────
FILE: models/drop.js
─────────────────────────────────────────────────────────────

Line 7:  'INSERT INTO drops (title, description, image_url, release_date, status, type, collection_id)'
         → Note: collection_id column REMOVED from new schema
         → 'INSERT INTO drops (title, description, image_url, release_date, status, type) VALUES ($1, $2, $3, $4, $5, $6)'
Line 18: return result.insertId → return result.rows[0].id

Line 24-36: Dynamic WHERE/ORDER BY → Change ? to $N sequentially
  Line 30: 'WHERE status = "live" OR status = "reservation"'
  → This hardcoded string comparison works in PG too, but better to use parameterized:
  → 'WHERE status = $1 OR status = $2' (add params)

Line 50: Update fields loop — Change ? to $N, track index.
Line 65: result.affectedRows → result.rowCount
Line 68: result.affectedRows > 0 → result.rowCount > 0

Line 74: 'DELETE FROM drops WHERE id = ?' → $1
Line 75: result.affectedRows → result.rowCount


─────────────────────────────────────────────────────────────
FILE: models/product.js ← MOST COMPLEX CHANGE
─────────────────────────────────────────────────────────────

IMPORT ADDITION:
  Add at top: const { pool } = require('../db/connection');

Line 13: INSERT INTO products (...) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         → VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
Line 24: result.insertId → result.rows[0].id

Line 52-58: JSON parsing of sizes/colors/image_urls:
  const products = rows.map(row => ({
    ...row,
    sizes: typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes,
    ...
  }));
  → With PG/JSONB, rows come back as native JS arrays. The typeof check
    is harmless (won't crash) but the string branch is dead code.
  → SAFE — can leave as-is or simplify to just: { ...row }

Line 72: 'SELECT * FROM products WHERE id = ?' → $1
Line 78-81: Same JSON parsing — same treatment as above

Line 90: 'SELECT * FROM products' → no params needed (fine)
Line 92-97: Same JSON parsing

Line 119: UPDATE products SET ... WHERE id = ?
          → UPDATE products SET ... WHERE id = $8 (or sequential $N)
Line 128: is_active ? 1 : 0 → is_active ? TRUE : FALSE (or keep as-is, PG casts)
Line 130: result.affectedRows > 0 → result.rowCount > 0

Lines 146-152: ON DUPLICATE KEY UPDATE
  SQL: `INSERT INTO product_quality_prices ... ON DUPLICATE KEY UPDATE price = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP`
  → INSERT INTO product_quality_prices (product_id, quality_level_id, price, is_active)
    VALUES ($1, $2, $3, 1)
    ON CONFLICT (product_id, quality_level_id)
    DO UPDATE SET price = EXCLUDED.price, is_active = 1, updated_at = NOW()

Line 155: result.affectedRows > 0 → result.rowCount > 0

Line 166: DELETE FROM products WHERE id = ? → $1, affectedRows → rowCount


─────────────────────────────────────────────────────────────
FILE: models/order.js
─────────────────────────────────────────────────────────────

Line 29-51: INSERT INTO orders (...) VALUES (...)
  → Change all ? to $N (19 parameters → $1 through $19)
  → Add RETURNING id
Line 53: result.insertId → result.rows[0].id

Line 87-91: SELECT with LEFT JOIN, WHERE o.id = ?
  → o.id = $1

Line 102-109: SELECT with LEFT JOIN, WHERE o.user_id = ?
  → o.user_id = $1

Line 120-164: getAllOrders with dynamic WHERE
  → Change each `o.status = ?` to `o.status = $${++idx}`
  → Change each `o.product_id = ?` similarly
  → Change date parameters similarly
  → Track parameter index manually

Line 167-170: UPDATE orders SET status = ? WHERE id = ?
  → status = $1 WHERE id = $2
Line 169: affectedRows → rowCount


─────────────────────────────────────────────────────────────
FILE: models/orderItem.js
─────────────────────────────────────────────────────────────

Line 6-8: INSERT INTO order_items (...) VALUES (...)
  → Change 9 ? to $1-$9
  → Add RETURNING id
Line 9: result.insertId → result.rows[0].id


─────────────────────────────────────────────────────────────
FILE: models/productQualityPrice.js
─────────────────────────────────────────────────────────────

Line 10-15: SELECT with JOIN, WHERE qp.product_id = ? → $1
Line 27-32: Same query → $1

Line 44-49: WHERE qp.product_id = ? AND qp.quality_level_id = ? → $1, $2

Line 67-72: INSERT ... ON DUPLICATE KEY UPDATE
  → INSERT INTO product_quality_prices (...) VALUES ($1, $2, $3)
    ON CONFLICT (product_id, quality_level_id) DO UPDATE
    SET price = EXCLUDED.price, is_active = 1, updated_at = NOW()
  Parameters: [productId, qualityLevelId, price, price] → [productId, qualityLevelId, price]
Line 73: result.insertId → result.rows[0].id

Line 89: 'UPDATE product_quality_prices SET is_active = 0 WHERE product_id = ?' → $1
Line 96-101: INSERT ... ON DUPLICATE KEY UPDATE (same conversion as line 67-72)
  Parameters: [productId, qualityLevelId, price, price] → [productId, qualityLevelId, price]

Line 134: 'DELETE FROM product_quality_prices WHERE product_id = ?' → $1

Line 150-157: WHERE qp.product_id IN (placeholders)
  → Build $N placeholders dynamically:
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',')
  → Pass productIds directly (pg handles array params)

Line 169: result.affectedRows → result.rowCount


─────────────────────────────────────────────────────────────
FILE: models/qualityLevel.js
─────────────────────────────────────────────────────────────

Line 9: 'SELECT * FROM quality_levels WHERE is_active = 1'
  → 'SELECT * FROM quality_levels WHERE is_active = TRUE'
  (both work in PG, but TRUE is canonical)

Line 46: 'INSERT INTO quality_levels (name, description, sort_order) VALUES (?, ?, ?)'
  → VALUES ($1, $2, $3) RETURNING id
Line 48: result.insertId → result.rows[0].id

Line 61: 'UPDATE quality_levels SET name=?, description=?, sort_order=?, is_active=? WHERE id=?'
  → $1, $2, $3, $4, $5
  is_active: is_active ? 1 : 0 → is_active ? TRUE : FALSE
Line 63: affectedRows → rowCount

Line 74: 'UPDATE quality_levels SET is_active=0 WHERE id=?' → $1, $2
  → is_active = FALSE  (PG native boolean)
  affectedRows → rowCount

Line 89-98: SELECT COUNT + conditional DELETE → $1 parameter, affectedRows → rowCount


─────────────────────────────────────────────────────────────
FILE: models/settings.js  ← REQUIRES REWRITE
─────────────────────────────────────────────────────────────

LINE 5 (CRITICAL):
  CURRENT: 'SELECT setting_key, setting_value FROM settings'
  ← Columns don't exist! Schema has "key" and "value"
  FIX:    'SELECT "key", "value" FROM settings'

LINE 20 (CRITICAL):
  CURRENT: 'UPDATE settings SET setting_value = ? WHERE setting_key = ?'
  FIX:     'UPDATE settings SET "value" = $1 WHERE "key" = $2'
  (Double quotes required — "key" is a PG reserved word)

Note: $1/$2 needed here because the original ? won't work with pg driver.


─────────────────────────────────────────────────────────────
FILE: models/announcement.js
─────────────────────────────────────────────────────────────

Line 5: 'SELECT * FROM announcements WHERE id = 1 LIMIT 1'
  → 'SELECT * FROM announcements WHERE id = 1 LIMIT 1'
  (No params needed — fine as-is, though adding RETURNING is optional)

Line 14-18: UPDATE announcements SET ... WHERE id = 1
  → Change to static (no parameters needed for WHERE)
  → But the SET values should use $N params
  → is_enabled ?? 1 → is_enabled ?? TRUE (PG boolean)

Line 22-26: INSERT INTO announcements (id, ...) VALUES (1, ...)
  → Better: Use INSERT ... ON CONFLICT (id) DO UPDATE SET (...)
  → This replaces the affectedRows === 0 check
  → Parameters: $1 through $8 (title, message, image_url, button_text, is_enabled, version, status, id)

affectedRows → rowCount throughout


─────────────────────────────────────────────────────────────
FILE: models/notification.js
─────────────────────────────────────────────────────────────

Line 5-8: INSERT INTO notifications (type, reference_id, title, description, is_seen)
  VALUES (?, ?, ?, ?, FALSE)
  → VALUES ($1, $2, $3, $4, FALSE) RETURNING id
  → result.insertId → result.rows[0].id

Line 13-21: Dynamic WHERE with is_seen = ?
  → is_seen = $1 (pass false/true directly — PG handles booleans)

Line 29: 'UPDATE notifications SET is_seen = TRUE WHERE id = ?' → $1
Line 34: 'UPDATE notifications SET is_seen = TRUE WHERE is_seen = FALSE'
  → This is PG-native, works fine
  → affectedRows → rowCount

Line 44: 'SELECT COUNT(*) as count FROM notifications WHERE is_seen = FALSE'
  → Works in PG, return is rows[0].count (same as MySQL aliased name) ✅


─────────────────────────────────────────────────────────────
FILE: models/contactMessage.js
─────────────────────────────────────────────────────────────

Line 6-8: INSERT INTO contact_messages (name, email, subject, message, status)
  VALUES (?, ?, ?, ?, 'unread')
  → VALUES ($1, $2, $3, $4, 'unread') RETURNING id

Line 15-18: Dynamic WHERE status = ? → $1
Line 29: WHERE id = ? → $1
Line 35: UPDATE ... WHERE id = ? → $1, affectedRows → rowCount


─────────────────────────────────────────────────────────────
FILE: controllers/reservationController.js ← REQUIRES REWRITE
─────────────────────────────────────────────────────────────

This file uses pool.query() directly with ? placeholders.
No model file exists. Must either:
A) Create models/reservation.js and move all queries there
B) Convert all ? to $N inline

Line 49-67: INSERT INTO reservations (...) VALUES (...)
  → 13 parameters → $1 through $13
  → Add RETURNING id
Line 69: result.insertId → result.rows[0].id

Line 118-161: Complex SELECT with 3 JOINs
  → Change each ? to sequential $N
  → WHERE r.status = ? → $1
  → r.product_id = ? → $2, etc.

Line 233: 'UPDATE reservations SET status = ? WHERE id = ?' → $1, $2
  → result.affectedRows → result.rowCount

Line 250: 'DELETE FROM reservations WHERE id = ?' → $1
  → result.affectedRows → result.rowCount


─────────────────────────────────────────────────────────────
FILE: controllers/storeConfigController.js
─────────────────────────────────────────────────────────────

Line 6-12: SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
  → Works in PG, BUT result key is 'column_name' (lowercase), NOT 'COLUMN_NAME'
  Line 13: c.COLUMN_NAME → c.column_name

Line 24-30: INSERT INTO store_config (id, store_mode, announcement) VALUES ...
  → Add ON CONFLICT (id) DO NOTHING at the end
  → Or use the new upsert pattern if needed

Line 45-46: INSERT INTO store_config (...) VALUES (?, ?, ?)
  → → VALUES ($1, $2, $3)

Line 64-65: Validation of store_mode — Enum check against validModes array
  → 'reservation' maps to 'reserve' (handled by normalizeStoreMode)
  → This logic is fine, no DB changes needed

Lines 77-95: Dynamic UPDATE — builds SET clause from detected columns
  → Change each ? to sequential $N


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4: FILES REQUIRING NO CHANGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These files use no direct SQL queries and only import/export JS objects:

  - routes/authRoutes.js             ✅ No SQL
  - routes/productRoutes.js          ✅ No SQL
  - routes/dropRoutes.js             ✅ No SQL
  - routes/orderRoutes.js            ✅ No SQL
  - routes/reservationRoutes.js      ✅ No SQL
  - routes/settingsRoutes.js         ✅ No SQL
  - routes/announcementRoutes.js     ✅ No SQL
  - routes/notificationRoutes.js     ✅ No SQL
  - routes/contactRoutes.js          ✅ No SQL
  - routes/qualityLevelRoutes.js     ✅ No SQL
  - routes/adminRoutes.js            ✅ No SQL
  - routes/adminReservationRoutes.js ✅ No SQL
  - routes/upload.js                 ✅ No SQL
  - middleware/authMiddleware.js     ✅ No SQL
  - middleware/storeModeMiddleware.js ← Has ONE query (see below)
  - middleware/errorHandler.js       ✅ No SQL
  - middleware/cookieParser.js       ✅ No SQL
  - controllers/productController.js ✅ No SQL (delegates to model)
  - controllers/authController.js    ✅ No SQL (delegates to model)
  - controllers/orderController.js   ✅ No SQL (delegates to model)
  - controllers/announcementController.js ✅ No SQL (delegates to model)
  - controllers/notificationController.js ✅ No SQL (delegates to model)
  - controllers/contactController.js    ✅ No SQL (delegates to model)
  - controllers/qualityLevelController.js ✅ No SQL (delegates to model)
  - utils/email.js                   ✅ No SQL
  - utils/storeMode.js               ✅ No SQL
  - utils/events.js                  ✅ No SQL


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5: middleware/storeModeMiddleware.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Line 13: 'SELECT store_mode FROM store_config WHERE id = 1'
  → No ? placeholders, but ensure column name matches.
  → store_mode column exists in both old and new schema ✅
  → Access: rows[0].store_mode — same in PG ✅


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6: NEW FILES TO CREATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

models/reservation.js — Extract queries from reservationController.js

```javascript
const { pool } = require('../db/connection');

async function createReservation(data) {
    const { userId, fullName, email, phone, productId, productName,
        size, color, quantity, qualityLevelId, priceAtPurchase, storeMode } = data;
    const [result] = await pool.query(
        `INSERT INTO reservations (
            user_id, full_name, email, phone, product_id, product_name,
            size, color, quantity, quality_level_id, price_at_purchase,
            store_mode, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
        RETURNING id`,
        [userId, fullName, email, phone, productId, productName,
            size, color, quantity, qualityLevelId, priceAtPurchase, storeMode]
    );
    return result.rows[0].id;
}

async function getReservations(filters = {}) {
    const { status, productId, startDate, endDate } = filters;
    let query = `
        SELECT r.*, p.name AS product_name, p.image_urls AS product_image_urls,
               p.price AS product_base_price, u.name AS user_name,
               u.email AS user_email, ql.name AS quality_name
        FROM reservations r
        LEFT JOIN products p ON r.product_id = p.id
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN quality_levels ql ON r.quality_level_id = ql.id
    `;
    const params = [];
    const whereClauses = [];
    let paramIdx = 1;

    if (status && status !== 'all') {
        whereClauses.push(`r.status = $${paramIdx++}`);
        params.push(status);
    }
    if (productId && productId !== 'all') {
        whereClauses.push(`r.product_id = $${paramIdx++}`);
        params.push(productId);
    }
    if (startDate) {
        whereClauses.push(`r.created_at >= $${paramIdx++}`);
        params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
        whereClauses.push(`r.created_at <= $${paramIdx++}`);
        params.push(`${endDate} 23:59:59`);
    }

    if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ` ORDER BY r.created_at DESC`;

    const [rows] = await pool.query(query, params);
    return rows;
}

async function updateReservationStatus(id, status) {
    const [result] = await pool.query(
        'UPDATE reservations SET status = $1 WHERE id = $2',
        [status, id]
    );
    return result.rowCount > 0;
}

async function deleteReservation(id) {
    const [result] = await pool.query(
        'DELETE FROM reservations WHERE id = $1',
        [id]
    );
    return result.rowCount > 0;
}

module.exports = {
    createReservation, getReservations, updateReservationStatus, deleteReservation
};
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7: DEAD CODE REMOVAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following code references columns/tables that don't exist in the new schema:

1. dropController.js line 97-101: References column 'price' on drops table
   → This column never existed. The code does a MIN(price) query on the
     PRODUCTS table (not drops), so it works correctly. No change needed.

2. dropController.js line 154: Checks `item.is_active` on drop objects
   → Drops don't have an is_active column. The fallback works:
     `item.is_active ? 'live' : 'upcoming'` is dead code path. No crash.

3. dropController.js line 176-180: Checks `oldDrop.status` and `dropData.is_active`
   → is_active not a drops column. Gracefully handled. No change needed.

4. storeConfigController.js line 25-30: Handles legacy columns 'announcement_message', 'mode'
   → These columns won't exist in new schema. The code gracefully falls through.
   → Consider cleaning up: remove legacy column handling after migration.

5. models/settings.js: Queries 'setting_key' / 'setting_value' (must change to "key"/"value")


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8: MIGRATION SEQUENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step-by-step migration plan:

1. CREATE Supabase project and note connection string
2. UPDATE .env file with new DATABASE_URL pointing to Supabase
3. REMOVE "mysql2" from package.json dependencies
4. REWRITE db/connection.js to use 'pg' Pool (see above)
5. RUN supabase_schema.sql in Supabase SQL Editor (creates all tables + seed data)
6. PATCH models/settings.js column names (setting_key→"key", setting_value→"value")
7. PATCH ALL models/*.js files:
   - Replace all ? with $1, $2, $3... sequential placeholders
   - Replace result.insertId with result.rows[0].id
   - Replace result.affectedRows with result.rowCount
   - Convert INSERT IGNORE to ON CONFLICT DO NOTHING
   - Convert ON DUPLICATE KEY UPDATE to ON CONFLICT ... DO UPDATE
8. PATCH controllers/reservationController.js:
   - Convert all ? to $N
   - Convert result.insertId and affectedRows
9. PATCH db/init.js (or REMOVE if using Supabase migrations)
10. PATCH middleware/storeModeMiddleware.js (COLUMN_NAME → column_name)
11. CREATE models/reservation.js (new file, extract from controller)
12. TEST all endpoints with Postman/test suite
13. VERIFY data integrity if migrating existing data (separate ETL step)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9: TESTING CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ User signup / login / Google OAuth
□ Password reset flow
□ Create / list / update / delete drops
□ Create / list / update / delete products (with quality prices)
□ Create / list / update / delete orders
□ Create / list / update / delete reservations
□ Store config get / update
□ Settings get / update
□ Announcement get / update / SSE stream
□ Notification list / mark as seen / mark all seen / count
□ Contact message submit / list / update status
□ Quality level CRUD
□ Store mode middleware blocking when closed
□ Email notifications fire correctly
□ Admin routes properly restricted by verifyAdmin