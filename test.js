const { pool } = require('./db/connection');

async function test() {
  try {
    const result = await pool.query('SELECT current_database() as db');
    console.log("Connected DB:", result.rows[0]);

    const countResult = await pool.query('SELECT COUNT(*) as count FROM drops');
    console.log("Drops count:", countResult.rows[0]);
  } catch (err) {
    console.error(err);
  }
}

test();