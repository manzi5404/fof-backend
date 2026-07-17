const { pool } = require('./db/connection');

async function runFix() {
    console.log('🔧 Reservations table is now managed via supabase_schema.sql\n');
    console.log('📋 Schema is defined in: fof-backend/db/supabase_schema.sql\n');
    console.log('⚠️ This script is deprecated. Apply changes via Supabase SQL Editor.\n');
    
    try {
        const result = await pool.query('SELECT COUNT(*) FROM reservations');
        console.log(`📊 Current reservations count: ${result.rows[0].count}\n`);
    } catch (error) {
        console.log('⚠️ Reservations table may not exist.\n');
    } finally {
        await pool.end();
    }
}

runFix();