const { pool } = require('../db/connection');

async function getAllQualityLevels() {
  const result = await pool.query(
    'SELECT * FROM quality_levels WHERE is_active = true ORDER BY sort_order ASC'
  );
  return result.rows;
}

async function getAllQualityLevelsAdmin() {
  const result = await pool.query(
    'SELECT * FROM quality_levels ORDER BY sort_order ASC'
  );
  return result.rows;
}

async function getQualityLevelById(id) {
  const result = await pool.query(
    'SELECT * FROM quality_levels WHERE id = $1',
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function createQualityLevel(data) {
  const { name, description, sort_order } = data;
  const result = await pool.query(
    'INSERT INTO quality_levels (name, description, sort_order) VALUES ($1, $2, $3) RETURNING id',
    [name, description || null, sort_order || 0]
  );
  return result.rows[0].id;
}

async function updateQualityLevel(id, data) {
  const { name, description, sort_order, is_active } = data;
  const result = await pool.query(
    'UPDATE quality_levels SET name = $1, description = $2, sort_order = $3, is_active = $4 WHERE id = $5',
    [name, description || null, sort_order || 0, is_active ? true : false, id]
  );
  return result.rowCount > 0;
}

async function deleteQualityLevel(id) {
  const result = await pool.query(
    'UPDATE quality_levels SET is_active = false WHERE id = $1',
    [id]
  );
  return result.rowCount > 0;
}

async function hardDeleteQualityLevel(id) {
  const priceCheck = await pool.query(
    'SELECT COUNT(*) as count FROM product_quality_prices WHERE quality_level_id = $1',
    [id]
  );

  if (parseInt(priceCheck.rows[0].count) > 0) {
    throw new Error('Cannot delete quality level: it is referenced by product prices');
  }

  const result = await pool.query(
    'DELETE FROM quality_levels WHERE id = $1',
    [id]
  );
  return result.rowCount > 0;
}

module.exports = {
  getAllQualityLevels,
  getAllQualityLevelsAdmin,
  getQualityLevelById,
  createQualityLevel,
  updateQualityLevel,
  deleteQualityLevel,
  hardDeleteQualityLevel
};