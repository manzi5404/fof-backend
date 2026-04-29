// connection.js
const mysql = require('mysql2/promise');

// ==============================
// Database Configuration
// PRIORITY: MYSQL* (Railway/Render default) || DB_* (manual override)
// ==============================
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
};

// ==============================
// Validation: Check required config
// ==============================
const requiredKeys = ['host', 'user', 'password', 'database'];
const missing = requiredKeys.filter(key => !dbConfig[key]);

if (missing.length > 0) {
  console.error('❌ Missing database configuration:', missing.join(', '));
  console.error('   Required: MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE (or DB_* equivalents)');
}

// ==============================
// Environment Variable Logging
// ==============================
console.log('💡 Database Configuration:');
console.table({
  host: dbConfig.host || '(not set)',
  user: dbConfig.user || '(not set)',
  database: dbConfig.database || '(not set)',
  port: dbConfig.port || '(not set)',
  passwordSet: !!dbConfig.password,
  source: process.env.MYSQLHOST || process.env.MYSQLUSER ? 'MYSQL* (provider default)' : 'DB_* (manual)'
});

// ==============================
// Create MySQL Connection Pool
// ==============================
let pool;

try {
  pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('✅ MySQL connection pool created');
} catch (err) {
  console.error('❌ Failed to create MySQL pool:', err.message);
}

// ==============================
// Verify Connection (non-blocking)
// ==============================
async function initializeDatabase() {
  if (!pool) {
    console.error('❌ Cannot verify connection: pool not initialized');
    return;
  }

  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection verified');
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Check: host, port, user, password, database, network access');
  }
}

// ==============================
// Export
// ==============================
module.exports = { pool, initializeDatabase };