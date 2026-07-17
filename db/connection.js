const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('[DB] ✅ Connected to Supabase');
});

pool.on('error', (err) => {
  console.error('[DB] ❌ Pool error:', err.message);
});

async function getConnection() {
  return pool.connect();
}

async function initializeDatabase() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB] ✅ Database connection verified');
    return true;
  } catch (err) {
    console.error('[DB] ❌ Database connection failed:', err.message);
    return false;
  }
}

module.exports = { pool, getConnection, initializeDatabase };