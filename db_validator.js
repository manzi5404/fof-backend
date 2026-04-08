const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * DB_TEST_SCRIPT: Faith Over Fear Backend Database Validator
 * This script verifies connection, schema consistency, and CRUD functionality.
 */

const expectedSchema = {
    users: ['id', 'email', 'password_hash', 'name', 'google_id', 'created_at'],
    drops: ['id', 'title', 'description', 'image_url', 'release_date', 'status', 'collection_id', 'created_at'],
    products: ['id', 'drop_id', 'name', 'description', 'price', 'sizes', 'colors', 'image_urls', 'is_active', 'created_at'],
    reservations: ['id', 'user_id', 'full_name', 'email', 'phone', 'product_id', 'size', 'quantity', 'status', 'store_mode'],
    orders: ['id', 'user_id', 'product_id', 'product_name', 'total_price', 'status', 'payment_method'],
    announcements: ['id', 'title', 'message', 'image_url', 'is_enabled', 'status'],
    password_resets: ['id', 'user_id', 'token', 'expires_at', 'created_at']
};

async function testDatabase() {
    console.log('🚀 Starting Database Validation Script...\n');
    
    let connection;
    const summary = {
        connection: '❌ Failed',
        schemaMismatches: [],
        tableFetches: {},
        crudTest: '❌ Not Started'
    };

    try {
        // 1. Connect using environment variables
        connection = await mysql.createConnection({
            host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
            user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
            password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
            database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'faith_over_fear',
            port: process.env.MYSQLPORT || process.env.DB_PORT || 3306
        });

        summary.connection = '✅ Success';
        console.log('✅ Connection established successfully.\n');

        // 2. Validate Schema and Fetch Data
        console.log('🔍 Checking tables and columns...');
        for (const [tableName, expectedCols] of Object.entries(expectedSchema)) {
            try {
                // Check if table exists and get columns
                const [cols] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
                const actualCols = cols.map(c => c.Field);
                
                const missing = expectedCols.filter(x => !actualCols.includes(x));
                const extra = actualCols.filter(x => !expectedCols.includes(x));

                if (missing.length > 0) {
                    summary.schemaMismatches.push(`${tableName}: Missing [${missing.join(', ')}]`);
                }

                // Fetch a sample row
                const [rows] = await connection.query(`SELECT * FROM ${tableName} LIMIT 2`);
                summary.tableFetches[tableName] = `✅ Fetched ${rows.length} rows`;
                console.log(`   - ${tableName}: ${summary.tableFetches[tableName]}`);
                if (rows.length > 0) {
                    console.dir(rows[0]); // Print first row sample
                }
            } catch (err) {
                summary.tableFetches[tableName] = `❌ Error: ${err.message}`;
                console.error(`   - ${tableName}: ${summary.tableFetches[tableName]}`);
            }
        }
        console.log('');

        // 3. CRUD Test (using 'drops' table)
        console.log('🧪 Running CRUD Test on "drops" table...');
        try {
            // INSERT
            const [insertResult] = await connection.query(
                'INSERT INTO drops (title, description, status) VALUES (?, ?, ?)',
                ['TEST DROP', 'Temporary test content', 'upcoming']
            );
            const dropId = insertResult.insertId;
            console.log(`   - INSERT: Success (ID: ${dropId})`);

            // UPDATE
            await connection.query(
                'UPDATE drops SET title = ? WHERE id = ?',
                ['UPDATED TEST DROP', dropId]
            );
            console.log('   - UPDATE: Success');

            // DELETE
            const [deleteResult] = await connection.query('DELETE FROM drops WHERE id = ?', [dropId]);
            console.log(`   - DELETE: Success (${deleteResult.affectedRows} row removed)`);

            summary.crudTest = '✅ Success';
        } catch (crudErr) {
            summary.crudTest = `❌ Failed: ${crudErr.message}`;
            console.error(summary.crudTest);
        }

        // 4. Final Summary
        console.log('\n=========================================');
        console.log('📊 FINAL VALIDATION SUMMARY');
        console.log('=========================================');
        console.log(`Connection:      ${summary.connection}`);
        console.log(`CRUD Test:       ${summary.crudTest}`);
        
        console.log('\nTable Status:');
        Object.entries(summary.tableFetches).forEach(([tbl, status]) => {
            console.log(` - ${tbl.padEnd(15)}: ${status}`);
        });

        if (summary.schemaMismatches.length > 0) {
            console.log('\n⚠️  SCHEMA MISMATCHES DETECTED:');
            summary.schemaMismatches.forEach(m => console.log(` - ${m}`));
        } else {
            console.log('\n✅ All tables match the expected schema.');
        }
        console.log('=========================================\n');

    } catch (error) {
        console.error('❌ CRITICAL SCRIPT ERROR:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

testDatabase();
