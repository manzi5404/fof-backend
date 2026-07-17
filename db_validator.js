const { Pool } = require('pg');
require('dotenv').config();

const expectedSchema = {
    users: ['id', 'email', 'password_hash', 'name', 'google_id', 'created_at'],
    drops: ['id', 'title', 'description', 'image_url', 'release_date', 'status', 'created_at'],
    products: ['id', 'drop_id', 'name', 'description', 'price', 'sizes', 'colors', 'image_urls', 'is_active', 'created_at'],
    reservations: ['id', 'user_id', 'full_name', 'email', 'phone', 'product_id', 'size', 'quantity', 'status', 'store_mode'],
    orders: ['id', 'user_id', 'product_id', 'product_name', 'total_price', 'status', 'payment_method'],
    announcements: ['id', 'title', 'message', 'image_url', 'is_enabled', 'status'],
    password_resets: ['id', 'user_id', 'token', 'expires_at', 'created_at']
};

async function testDatabase() {
    console.log('🚀 Starting Database Validation Script...\n');
    
    const pool = new Pool({
        host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
        user: process.env.PGUSER || process.env.DB_USER || 'postgres',
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.PGDATABASE || process.env.DB_NAME || 'faith_over_fear',
        port: parseInt(process.env.PGPORT || process.env.DB_PORT || 5432, 10),
    });

    const summary = {
        connection: '❌ Failed',
        schemaMismatches: [],
        tableFetches: {},
        crudTest: '❌ Not Started'
    };

    try {
        await pool.query('SELECT 1');
        summary.connection = '✅ Success';
        console.log('✅ Connection established successfully.\n');

        console.log('🔍 Checking tables and columns...');
        for (const [tableName, expectedCols] of Object.entries(expectedSchema)) {
            try {
                const result = await pool.query(
                    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
                    [tableName]
                );
                const actualCols = result.rows.map(c => c.column_name);
                
                const missing = expectedCols.filter(x => !actualCols.includes(x));
                const extra = actualCols.filter(x => !expectedCols.includes(x));

                if (missing.length > 0) {
                    summary.schemaMismatches.push(`${tableName}: Missing [${missing.join(', ')}]`);
                }

                const fetchResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 2`);
                summary.tableFetches[tableName] = `✅ Fetched ${fetchResult.rows.length} rows`;
                console.log(`   - ${tableName}: ${summary.tableFetches[tableName]}`);
                if (fetchResult.rows.length > 0) {
                    console.dir(fetchResult.rows[0]);
                }
            } catch (err) {
                summary.tableFetches[tableName] = `❌ Error: ${err.message}`;
                console.error(`   - ${tableName}: ${summary.tableFetches[tableName]}`);
            }
        }
        console.log('');

        console.log('🧪 Running CRUD Test on "drops" table...');
        try {
            const insertResult = await pool.query(
                'INSERT INTO drops (title, description, status) VALUES ($1, $2, $3) RETURNING id',
                ['TEST DROP', 'Temporary test content', 'upcoming']
            );
            const dropId = insertResult.rows[0].id;
            console.log(`   - INSERT: Success (ID: ${dropId})`);

            await pool.query(
                'UPDATE drops SET title = $1 WHERE id = $2',
                ['UPDATED TEST DROP', dropId]
            );
            console.log('   - UPDATE: Success');

            const deleteResult = await pool.query('DELETE FROM drops WHERE id = $1', [dropId]);
            console.log(`   - DELETE: Success (${deleteResult.rowCount} row removed)`);

            summary.crudTest = '✅ Success';
        } catch (crudErr) {
            summary.crudTest = `❌ Failed: ${crudErr.message}`;
            console.error(summary.crudTest);
        }

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
        await pool.end();
    }
}

testDatabase();