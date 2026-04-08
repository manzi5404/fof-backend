const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./db/connection');

async function setupOrders() {
    console.log('🔧 Setting up orders table...\n');

    try {
        // Drop existing orders and order_items tables if they exist (old schema)
        console.log('📌 Dropping old tables if they exist...');
        await pool.query('DROP TABLE IF EXISTS order_items');
        await pool.query('DROP TABLE IF EXISTS orders');
        console.log('✅ Old tables dropped\n');

        // Create the new orders table
        console.log('📌 Creating orders table...');
        await pool.query(`
            CREATE TABLE orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT NULL,
                product_id INT NOT NULL,
                drop_id INT DEFAULT NULL,
                product_name VARCHAR(255) DEFAULT NULL,
                size VARCHAR(20) DEFAULT NULL,
                color VARCHAR(50) DEFAULT NULL,
                quantity INT NOT NULL DEFAULT 1,
                total_price DECIMAL(15, 2) NOT NULL,
                status ENUM('pending', 'contacted', 'delivered', 'cancelled') DEFAULT 'pending',
                payment_method VARCHAR(50) DEFAULT 'reservation',
                customer_name VARCHAR(255) DEFAULT NULL,
                customer_email VARCHAR(255) DEFAULT NULL,
                phone_number VARCHAR(50) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ Orders table created\n');

        // Show the table structure
        const [tableInfo] = await pool.query('DESCRIBE orders');
        console.log('📋 Orders table structure:');
        console.table(tableInfo);

        console.log('\n✅ Orders table setup completed successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) console.error('   Code:', error.code);
        if (error.sqlMessage) console.error('   SQL:', error.sqlMessage);
    } finally {
        await pool.end();
    }
}

setupOrders();
