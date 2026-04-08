const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./db/connection');

async function runFix() {
    console.log('🔧 Running reservations table fix...\n');

    try {
        // 1. Check if user_id column exists
        const [columns] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'faith_over_fear'
            AND TABLE_NAME = 'reservations'
            AND COLUMN_NAME = 'user_id'
        `);

        if (columns.length === 0) {
            console.log('📌 Adding user_id column...');
            await pool.query('ALTER TABLE reservations ADD COLUMN user_id INT DEFAULT NULL AFTER id');
            console.log('✅ user_id column added successfully\n');
        } else {
            console.log('✓ user_id column already exists\n');
        }

        // 2. Update status ENUM
        console.log('📌 Updating status ENUM...');
        await pool.query(`
            ALTER TABLE reservations
            MODIFY COLUMN status ENUM('pending', 'contacted', 'delivered', 'returned', 'cancelled') DEFAULT 'pending'
        `);
        console.log('✅ status ENUM updated successfully\n');

        // 3. Show table structure
        const [tableInfo] = await pool.query('DESCRIBE reservations');
        console.log('📋 Current reservations table structure:');
        console.table(tableInfo);

        console.log('\n✅ Reservation fix completed successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) console.error('   Code:', error.code);
    } finally {
        await pool.end();
    }
}

runFix();