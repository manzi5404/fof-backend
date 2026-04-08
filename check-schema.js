const { pool } = require('./db/connection');

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE announcements');
        console.log('Columns in announcements table:');
        rows.forEach(row => {
            console.log(`- ${row.Field}: ${row.Type}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error describing table:', err);
        process.exit(1);
    }
}

checkSchema();
