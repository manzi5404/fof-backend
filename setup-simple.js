const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'faith_over_fear',
    port: parseInt(process.env.PGPORT || 5432, 10),
});

async function run() {
    try {
        console.log('Connected.');
        await pool.query('DROP TABLE IF EXISTS announcements');
        console.log('Dropped.');
        
        await pool.query(`
            CREATE TABLE announcements (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_enabled BOOLEAN DEFAULT TRUE,
                version INTEGER NOT NULL DEFAULT 1,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('Created.');
        
        await pool.query(`
            INSERT INTO announcements (id, title, message, is_enabled, version)
            VALUES (1, 'NEW DROP IS HERE', 'Experience the latest "Faith Over Fear" collection. Limited pieces available.', true, 1)
        `);
        console.log('Seeded.');
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

run();