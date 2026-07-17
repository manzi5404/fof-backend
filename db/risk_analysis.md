# RISK ANALYSIS REPORT
# Faith Over Fear — MySQL → PostgreSQL / Supabase Migration
# ============================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 SAFE MIGRATIONS (Low Risk)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TABLE CREATION
   Risk: Almost zero. Creating tables with proper DDL is standard PG.
   Mitigation: Run in transaction with BEGIN/COMMIT. Supabase SQL Editor
   handles this automatically.

2. ENUM TYPE CREATION
   Risk: Low. CREATE TYPE is supported in PG 12+ and Supabase.
   Note: If you ever need to add values to an ENUM, you'll need:
         ALTER TYPE type_name ADD VALUE 'new_value';
         This must be a standalone statement (not in a transaction).

3. SEED DATA
   Risk: Low. INSERT ... ON CONFLICT DO NOTHING is idempotent.
   Quality levels and store_config will be seeded safely.

4. INDEX CREATION
   Risk: Low. Standard B-tree indexes on integer and text columns.

5. TRIGGER FUNCTION
   Risk: Low. The update_updated_at_column() function is a well-known pattern.
   Supabase supports PL/pgSQL functions natively.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 RISKY MIGRATIONS (Medium Risk — Test Thoroughly)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. JSON → JSONB CONVERSION
   Risk: Medium if existing data has JSON objects not arrays.
   Details: MySQL JSON column could contain any valid JSON. PostgreSQL
   JSONB will parse and store it but will reject duplicate keys.
   Migration: If bringing existing data, dump as text, validate, import.
   Mitigation: Test with sample data first.

7. DATETIME → TIMESTAMPTZ
   Risk: Medium. MySQL DATETIME has no timezone info.
   PostgreSQL TIMESTAMPTZ stores with timezone.
   Issue: If existing data was stored assuming a specific timezone
   but had no offset, PG will interpret it as UTC.
   Mitigation: When migrating data, convert:
     UPDATE table SET col = col::timestamp AT TIME ZONE 'UTC';

8. TINYINT(1) → BOOLEAN
   Risk: Low-Medium. MySQL TINYINT(1) stores 0/1. PG BOOLEAN expects
   true/false or 0/1 (both work). But if any TINYINT column stored
   values other than 0/1 (e.g., 2, 3, -1), they won't be valid booleans.
   Mitigation: Audit existing data before migration.

9. VARCHAR Length Changes
   Risk: Low. We're using same or longer lengths.
   drops.image_url: 255 → 512 (accommodating existing data)
   contact_messages.subject: 100 → 255 (wider)

10. SETTINGS KEY/VALUE COLUMN RENAME
    Risk: Medium. The model code queries 'setting_key'/'setting_value'
    but the schema has 'key'/'value'. If data exists under old column
    names, it must be migrated.
    Mitigation: Run ALTER TABLE settings RENAME COLUMN IF EXISTS first.

11. STORE_CONFIG DYNAMIC COLUMN REMOVAL
    Risk: Medium. If production data has 'mode', 'announcement_message',
    or 'banner_enabled' columns, they will be lost.
    Mitigation: Before migration, export any data in those columns.

12. NOTIFICATIONS COLUMN REMOVAL
    Risk: Medium. If production has 'message' and 'is_read' columns,
    those values will be lost.
    Mitigation: Migrate 'message' → 'description', 'is_read' → 'is_seen'
    before dropping old columns.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 LIKELY RUNTIME FAILURES (Will Break Without Code Changes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

13. MySQL PLACEHOLDER SYNTAX (?)
    Impact: EVERY database query will fail.
    Severity: CRITICAL — Application will be completely non-functional.
    Fix: Convert all ? to $1, $2, $3... in all JS files.
    Files affected: 11 model/controllers files, ~50 queries.

14. result.insertId
    Impact: Every INSERT operation will throw or return undefined.
    Fix: Add RETURNING id to all INSERT statements, use result.rows[0].id.
    Fallback: pg.insertResult[0].id (same approach).

15. result.affectedRows
    Impact: UPDATE and DELETE operations will fail with "cannot read
    property of undefined".
    Fix: Replace with result.rowCount.

16. INSERT IGNORE Statements
    Impact: Syntax error in PG.
    Fix: Convert to INSERT ... ON CONFLICT DO NOTHING.
    Files: db/init.js, models/announcement.js.

17. ON DUPLICATE KEY UPDATE
    Impact: Syntax error in PG.
    Fix: Convert to ON CONFLICT (cols) DO UPDATE SET.
    Files: models/product.js, models/productQualityPrice.js.

18. SHOW COLUMNS FROM
    Impact: Not valid PG syntax. storeConfigController will crash.
    Fix: Use information_schema.columns (different result format).

19. SETTINGS MODEL COLUMN MISMATCH
    Impact: Even after fixing placeholders, queries will fail because
    columns 'setting_key' and 'setting_value' don't exist.
    Fix: Update model to query "key" and "value".

20. mysql2 PACKAGE REMOVAL
    Impact: require('mysql2/promise') will throw module not found.
    Fix: Remove import, switch to require('pg').


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ DATA CONSISTENCY RISKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

21. ORPHANED ORDER DATA
    Impact: When a product is deleted (ON DELETE SET NULL),
    orders.product_id becomes NULL but order_items still reference
    the old product_id.
    Mitigation: New schema has same behavior. Order items and orders
    store product_name as snapshot, so display won't break.

22. RESERVATIONS WITHOUT MODEL FILE
    Impact: No validation layer. Controller does raw SQL.
    Risk: SQL injection if any user input isn't parameterized.
    Fix: Create models/reservation.js ASAP. Review all input handling.

23. FIRE-AND-FORGET EMAILS
    Impact: If process crashes between DB write and email send,
    users get reservation confirmation in DB but no email.
    Mitigation: Out of scope for migration. Acceptable for current scale.
    Long-term: Add job queue (BullMQ, Supabase Edge Functions + cron).

24. CONCURRENT WRITES TO STORE_CONFIG
    Impact: No row-level locking on store_config. Two admins updating
    simultaneously could overwrite each other's changes.
    Mitigation: Low risk (small team, few writes). Consider advisory lock
    if this becomes a problem.

25. HARD-CODED ADMIN EMAILS
    Impact: Admin access is controlled by email list in authMiddleware.js.
    If admin email changes, they lose access.
    Mitigation: Move admin list to database (new `admins` table) or env var.
    Not blocking for migration but should be addressed.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 PERFORMANCE CONCERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

26. FULL TABLE SCAN ON NOTIFICATIONS
    Impact: Notifications fetched with ORDER BY created_at DESC LIMIT 50.
    Without index, this scans the entire table.
    Mitigation: Already indexed: idx_notifications_seen on (is_seen).
    Add: CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

27. PRODUCTS AGGREGATION QUERY
    Impact: dropController.js runs MIN(price) GROUP BY query.
    Without proper index, this scans all products for each drop list.
    Mitigation: Already indexed: idx_products_drop ON products(drop_id).

28. JSONB QUERY PERFORMANCE
    Impact: If future queries filter by JSONB contents (e.g., WHERE sizes @> '["L"]'),
    a GIN index would be needed.
    Mitigation: Not currently needed — JSONB is only returned as-is.
    Re-evaluate if search functionality is added.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 MIGRATION RISK SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Category                 Count    Action Required
─────────────────────────────────────────────────
Safe migrations            5     Just run the SQL
Risky data conversions     7     Audit data, test first
Runtime failures          10     MUST fix code before PG switch
Data consistency risks     5     Architectural decisions needed
Performance concerns       3     Add indexes, monitor after launch
─────────────────────────────────────────────────
TOTAL ISSUES:            30

CRITICAL PATH:
  1. Rewrite db/connection.js → pg Pool
  2. Convert all ? → $N placeholders in 11 files
  3. Convert all result.insertId → result.rows[0].id
  4. Convert all result.affectedRows → result.rowCount
  5. Fix settings.js column names
  6. CREATE models/reservation.js
  7. Run schema SQL in Supabase
  8. Test exhaustively

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDED MIGRATION ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1 (Zero downtime):
  → Rewrite db/connection.js
  → Fix placeholder syntax in all JS files
  → Fix result.* property access in all JS files
  → Fix settings model column names
  → Create models/reservation.js

Phase 2 (Schema deployment):
  → Deploy new schema to Supabase
  → Verify seeding (quality levels, store_config, settings, announcements)

Phase 3 (Data migration — if existing data):
  → Export MySQL data via mysqldump or ETL tool
  → Transform: DATETIME → TIMESTAMPTZ, TINYINT → BOOLEAN, JSON → JSONB
  → Import into Supabase tables
  → Verify data integrity

Phase 4 (Testing):
  → Run full test suite
  → Manual QA on all user-facing flows
  → Load test reservation and order flows

Phase 5 (DNS/Switch):
  → Update DATABASE_URL in production env
  → Deploy
  → Monitor for 48 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF RISK ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━