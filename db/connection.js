// connection.js
const mysql = require('mysql2/promise');

// ==============================
// Database Configuration with Fallbacks
// ==============================
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
};

// ==============================
// Environment Variable Logging
// ==============================
console.log('💡 Checking DB Configuration:');
console.table({
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port,
  passwordSet: !!dbConfig.password,
});

// ==============================
// Create MySQL Pool
// ==============================
let pool;

try {
  pool = mysql.createPool(dbConfig);
  console.log('✅ MySQL pool created successfully');
} catch (err) {
  console.error('❌ Failed to create MySQL pool:', err.message);
}

// ==============================
// Function to Verify Connection
// ==============================
async function initializeDatabase() {
  if (!pool) {
    console.error('❌ Pool not initialized. Check DB configuration.');
    return;
  }

  try {
    const connection = await pool.getConnection();
    console.log('🚀 Database connection verified');
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    // App continues; don't crash
  }
}

// ==============================
// Export Pool & Initialize Function
// ==============================
module.exports = { pool, initializeDatabase };