const { pool } = require('./db/connection');

async function setupOrders() {
    console.log('🔧 Orders table is now managed via supabase_schema.sql\n');
    console.log('📋 Please apply the schema via Supabase SQL Editor.');
    console.log('🔗 File: fof-backend/db/supabase_schema.sql\n');
    
    try {
        const result = await pool.query('SELECT COUNT(*) FROM orders');
        console.log(`✅ Orders table exists with ${result.rows[0].count} record(s)\n`);
    } catch (error) {
        console.log('⚠️ Orders table may not exist. Apply supabase_schema.sql first.\n');
    } finally {
        await pool.end();
    }
}

setupOrders();