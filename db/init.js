const {pool} = require('./connection');

/**
 * Initializes the database schema.
 * Ensure './connection' uses require('mysql2/promise')
 */
async function initializeDatabase() {
    let connection;
    try {
        // Attempt to get a connection from the pool
        connection = await pool.getConnection();
        console.log('📦 Connected! Initializing Database Tables...');

        // 1. Users Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                name VARCHAR(255),
                google_id VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // 2. Drops Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS drops (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url VARCHAR(255),
                release_date DATETIME,
                status ENUM('upcoming', 'reservation', 'live', 'closed') DEFAULT 'upcoming',
                type ENUM('new-drop', 'recent-drop') DEFAULT 'new-drop',
                collection_id INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // 3. Products Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                drop_id INT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(15, 2) NOT NULL,
                sizes JSON,
                colors JSON,
                image_urls JSON,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // 4. Quality Levels Table (Seeded below)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS quality_levels (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description VARCHAR(255) DEFAULT NULL,
                sort_order INT DEFAULT 0,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Seed default quality levels if empty
        const [qualityRows] = await connection.query('SELECT id FROM quality_levels LIMIT 1');
        if (qualityRows.length === 0) {
            await connection.query(`
                INSERT INTO quality_levels (name, description, sort_order, is_active)
                VALUES
                    ('Essential', 'Everyday tees, solid quality, standard cotton. Focus on comfort and value.', 1, 1),
                    ('Premium', 'Softer fabrics, better fit, stronger collar and seams. Emphasizes durability and shape retention.', 2, 1),
                    ('Luxe', 'High-end fabrics, very soft handfeel, best construction. Maximum comfort and longevity.', 3, 1)
            `);
            console.log('✅ Seeded default quality levels');
        }

        // 5. Store Config Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS store_config (
                id INT PRIMARY KEY DEFAULT 1,
                store_mode ENUM('live', 'reserve', 'closed') DEFAULT 'closed',
                announcement TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Ensure default config exists
        const [configRows] = await connection.query('SELECT id FROM store_config WHERE id = 1');
        if (configRows.length === 0) {
            await connection.query('INSERT INTO store_config (id, store_mode, announcement) VALUES (1, "closed", "Welcome to Faith Over Fear")');
        }

        // 6. Orders Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                customer_name VARCHAR(255),
                customer_email VARCHAR(255),
                phone_number VARCHAR(50),
                total_price DECIMAL(15, 2),
                status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
                payment_method VARCHAR(50) DEFAULT 'reservation',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // 7. Order Items Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT,
                product_name VARCHAR(255),
                quantity INT DEFAULT 1,
                size VARCHAR(50),
                color VARCHAR(50),
                quality_level_id INT,
                price_at_purchase DECIMAL(15, 2),
                total_price DECIMAL(15, 2),
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // 8. Product Quality Prices Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS product_quality_prices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                quality_level_id INT NOT NULL,
                price DECIMAL(15, 2) NOT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_product_quality (product_id, quality_level_id),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (quality_level_id) REFERENCES quality_levels(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // 9. Run Schema Migrations (Rename/Add columns safely)
        await runMigrations(connection);

        console.log('✅ Database Schema verified and tables ensured.');

    } catch (error) {
        console.error('❌ Database Initialization Error:', error.message);
        throw error; // Bubble up to server.js to stop startup on failure
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Handles table alterations without crashing if they already exist
 */
async function runMigrations(connection) {
    try {
        // Migration: Rename 'name' to 'title' in drops if old schema exists
        const [dropCols] = await connection.query('SHOW COLUMNS FROM drops');
        const dropFields = dropCols.map(c => c.Field);
        
        if (dropFields.includes('name') && !dropFields.includes('title')) {
            await connection.query('ALTER TABLE drops CHANGE COLUMN name title VARCHAR(255) NOT NULL');
            console.log('🔧 Migrated: Renamed drops.name to drops.title');
        }

        // Migration: Add type column to drops if missing
        if (!dropFields.includes('type')) {
            await connection.query("ALTER TABLE drops ADD COLUMN type ENUM('new-drop', 'recent-drop') DEFAULT 'new-drop' AFTER status");
            console.log('🔧 Migrated: Added drops.type column');
        }

        // Migration: Rename quality levels from old seed names to Essential/Premium/Luxe
        await connection.query(`
            UPDATE quality_levels SET
                name = 'Essential',
                description = 'Everyday tees, solid quality, standard cotton. Focus on comfort and value.'
            WHERE id = 1 AND name IN ('Basic', 'Essential')
        `);
        await connection.query(`
            UPDATE quality_levels SET
                name = 'Premium',
                description = 'Softer fabrics, better fit, stronger collar and seams. Emphasizes durability and shape retention.'
            WHERE id = 2 AND name IN ('Standard', 'Premium')
        `);
        await connection.query(`
            UPDATE quality_levels SET
                name = 'Luxe',
                description = 'High-end fabrics, very soft handfeel, best construction. Maximum comfort and longevity.'
            WHERE id = 3 AND name IN ('Premium', 'Luxe')
        `);
        console.log('🔧 Migrated: Quality levels renamed to Essential / Premium / Luxe');

        // Migration: Add quality_level_id to orders if missing (legacy support)
        const [orderCols] = await connection.query('SHOW COLUMNS FROM orders');
        const orderFields = orderCols.map(c => c.Field);
        if (!orderFields.includes('quality_level_id')) {
            await connection.query('ALTER TABLE orders ADD COLUMN quality_level_id INT AFTER quantity');
        }

        // Migration: Seed quality prices for products that have none
        const [unseededProducts] = await connection.query(`
            SELECT id, price FROM products
            WHERE id NOT IN (SELECT DISTINCT product_id FROM product_quality_prices)
        `);
        if (unseededProducts.length > 0) {
            for (const product of unseededProducts) {
                const base = parseFloat(product.price);
                await connection.query(`
                    INSERT IGNORE INTO product_quality_prices (product_id, quality_level_id, price, is_active)
                    VALUES
                        (?, 1, ?, 1),
                        (?, 2, ?, 1),
                        (?, 3, ?, 1)
                `, [
                    product.id, base,
                    product.id, Math.round(base * 1.3),
                    product.id, Math.round(base * 1.7)
                ]);
            }
            console.log(`🔧 Migrated: Seeded quality prices for ${unseededProducts.length} product(s)`);
        }
    } catch (err) {
        console.warn('⚠️  Migration Warning:', err.message);
    }
}

module.exports = { initializeDatabase };
