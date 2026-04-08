const { pool } = require('./db/connection');

async function fix() {
    try {
        console.log('Dropping table...');
        await pool.query('DROP TABLE IF EXISTS announcements');
        console.log('Creating table...');
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
        console.log('Done.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fix();
