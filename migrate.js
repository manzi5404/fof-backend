/**
 * migrate.js — One-shot database migration script
 * Faith Over Fear — Railway MySQL Schema Reset
 *
 * USAGE (local):
 *   node migrate.js
 *
 * USAGE (Railway — run in the Railway shell or as a one-off command):
 *   node migrate.js
 *
 * REMOVE THIS FILE after a successful migration.
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const mysql   = require('mysql2/promise');

// Load .env if running locally (Railway injects vars automatically)
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ── 1. Locate the schema.sql file ────────────────────────────────────────────
// It lives one directory above fof-backend/ (at the project root)
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`❌  schema.sql not found at: ${SCHEMA_PATH}`);
    console.error('    Make sure schema.sql is in the project root (next to fof-backend/).');
    process.exit(1);
}

const sql = fs.readFileSync(SCHEMA_PATH, 'utf8')
    // Strip SQL comments so the parser doesn't choke
    .replace(/--[^\n]*/g, '')
    // Collapse blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// ── 2. Build a dedicated migration connection ─────────────────────────────────
// Uses the same variable priority as db/connection.js
const connectionConfig = {
    host:     process.env.MYSQLHOST     || process.env.DB_HOST,
    port:     process.env.MYSQLPORT     || process.env.DB_PORT     || 3306,
    user:     process.env.MYSQLUSER     || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    // CRITICAL: required to execute multiple statements in one call
    multipleStatements: true,
    connectTimeout: 30000,
};

// ── 3. Run the migration ──────────────────────────────────────────────────────
async function runMigration() {
    console.log('\n🚀  Starting F>F Database Migration...');
    console.log(`    Schema file : ${SCHEMA_PATH}`);
    console.log(`    DB host     : ${connectionConfig.host}`);
    console.log(`    DB name     : ${connectionConfig.database}\n`);

    let connection;
    try {
        connection = await mysql.createConnection(connectionConfig);
        console.log('✅  Connected to database.');

        console.log('⏳  Executing schema SQL...');
        await connection.query(sql);

        console.log('\n✅  Migration complete! All tables created / verified.');
        console.log('    Next steps:');
        console.log('    1. Restart your Railway backend deployment.');
        console.log('    2. Test GET /api/drops — should return { success: true, drops: [] }');
        console.log('    3. Test GET /api/settings — should return purchasingDisabled & isRestocking');
        console.log('    4. DELETE migrate.js and the /api/migrate endpoint from server.js.\n');
        return true;
    } catch (err) {
        console.error('\n❌  Migration FAILED:');
        console.error('    Error code   :', err.code);
        console.error('    Error message:', err.message);
        if (err.sqlMessage) {
            console.error('    SQL message  :', err.sqlMessage);
        }
        return false;
    } finally {
        if (connection) await connection.end();
    }
}

// Run immediately when called as a standalone script
runMigration().then(success => process.exit(success ? 0 : 1));

module.exports = { runMigration };
