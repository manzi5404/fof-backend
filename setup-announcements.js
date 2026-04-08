const { pool } = require('./db/connection');

async function setup() {
    try {
        console.log('Starting DB setup for Backend Bridge...');

        // Drop and recreate to ensure schema consistency
        await pool.query('DROP TABLE IF EXISTS announcements');

        await pool.query(`
            CREATE TABLE announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_enabled BOOLEAN DEFAULT TRUE,
                version INT NOT NULL DEFAULT 1,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table "announcements" created with new schema (is_enabled, version INT).');

        await pool.query(`
            INSERT INTO announcements (id, title, message, is_enabled, version)
            VALUES (1, ?, ?, ?, ?)
        `, ['NEW DROP IS HERE', 'Experience the latest "Faith Over Fear" collection. Limited pieces available.', true, 1]);
        console.log('✅ Initial announcement seeded with version 1.');

        process.exit(0);
    } catch (err) {
        console.error('❌ DB Setup Error:', err);
        process.exit(1);
    }
}

setup();
