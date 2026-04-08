const { pool } = require('./db/connection');

async function test() {
  try {
    const [db] = await pool.query('SELECT DATABASE() as db');
    console.log("Connected DB:", db);

    const [rows] = await pool.query('SELECT COUNT(*) as count FROM drops');
    console.log("Drops count:", rows);
  } catch (err) {
    console.error(err);
  }
}

test();