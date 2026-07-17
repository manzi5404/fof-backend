// ============================================================
// DATABASE INITIALIZATION - PRODUCTION SAFE
// ============================================================
// This module handles safe database connection for the backend.
//
// IMPORTANT: Schema is managed EXCLUSIVELY via supabase_schema.sql
// in the Supabase SQL Editor. This file does NOT create tables.
// ============================================================

const { pool, initializeDatabase: verifyConnection } = require('./connection');

const ENV = process.env.NODE_ENV || 'development';

/**
 * Safe database initialization for production and development.
 * 
 * PRODUCTION: No schema operations, only connection verification.
 * DEVELOPMENT: Connection verification only (no schema/seeding).
 * 
 * Schema creation is handled via supabase_schema.sql in Supabase SQL Editor.
 */
async function initializeDatabase() {
  console.log(`[INIT] 🌐 Running in ${ENV} mode`);

  if (ENV === 'production') {
    console.log('[INIT] 🛡️ Production mode: Skipping all schema/table operations');
    console.log('[INIT] 📋 Schema is managed via supabase_schema.sql in Supabase SQL Editor');
    
    const connected = await verifyConnection();
    if (!connected) {
      throw new Error('Database connection failed in production');
    }
    
    console.log('[INIT] ✅ Connection verified - ready for production queries');
    return true;
  }

  const connected = await verifyConnection();
  if (!connected) {
    console.warn('[INIT] ⚠️ Development mode: Could not verify database connection');
    console.warn('[INIT] 💡 Ensure Supabase is accessible and connection config is correct');
    return false;
  }

  console.log('[INIT] ✅ Development mode: Connection ready');
  console.log('[INIT] 📋 Schema should be applied via: npx supabase db push OR Supabase SQL Editor');
  
  return true;
}

module.exports = { initializeDatabase };