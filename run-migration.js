const fs = require('fs');
const path = require('path');
const { pool } = require('./db/connection');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'db/migration_status_restructure.sql'), 'utf8');
  const statements = sql.split(';').filter(s => s.trim().length > 0);
  for (const statement of statements) {
    try {
      console.log('Executing:', statement.trim());
      await pool.query(statement);
    } catch (err) {
      console.error('Error executing query:', err.message);
    }
  }
  console.log('Migration finished.');
  process.exit(0);
}

run();
