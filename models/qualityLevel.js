const { pool } = require('../db/connection');

/**
 * Get all active quality levels
 * @returns {Promise<Array>} Array of quality levels
 */
async function getAllQualityLevels() {
  const [rows] = await pool.query(
    'SELECT * FROM quality_levels WHERE is_active = 1 ORDER BY sort_order ASC'
  );
  return rows;
}

/**
 * Get all quality levels (including inactive) - for admin
 * @returns {Promise<Array>} Array of all quality levels
 */
async function getAllQualityLevelsAdmin() {
  const [rows] = await pool.query(
    'SELECT * FROM quality_levels ORDER BY sort_order ASC'
  );
  return rows;
}

/**
 * Get a single quality level by ID
 * @param {number} id - Quality level ID
 * @returns {Promise<Object|null>} Quality level object or null
 */
async function getQualityLevelById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM quality_levels WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Create a new quality level
 * @param {Object} data - Quality level data { name, description, sort_order }
 * @returns {Promise<number>} Inserted ID
 */
async function createQualityLevel(data) {
  const { name, description, sort_order } = data;
  const [result] = await pool.query(
    'INSERT INTO quality_levels (name, description, sort_order) VALUES (?, ?, ?)',
    [name, description || null, sort_order || 0]
  );
  return result.insertId;
}

/**
 * Update a quality level
 * @param {number} id - Quality level ID
 * @param {Object} data - Updated data
 * @returns {Promise<boolean>} Success status
 */
async function updateQualityLevel(id, data) {
  const { name, description, sort_order, is_active } = data;
  const [result] = await pool.query(
    'UPDATE quality_levels SET name = ?, description = ?, sort_order = ?, is_active = ? WHERE id = ?',
    [name, description || null, sort_order || 0, is_active ? 1 : 0, id]
  );
  return result.affectedRows > 0;
}

/**
 * Delete a quality level (soft delete by setting is_active = 0)
 * @param {number} id - Quality level ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteQualityLevel(id) {
  const [result] = await pool.query(
    'UPDATE quality_levels SET is_active = 0 WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

/**
 * Permanently delete a quality level (hard delete)
 * Only possible if no product prices reference this level
 * @param {number} id - Quality level ID
 * @returns {Promise<boolean>} Success status
 */
async function hardDeleteQualityLevel(id) {
  // Check if any product prices reference this level
  const [priceCheck] = await pool.query(
    'SELECT COUNT(*) as count FROM product_quality_prices WHERE quality_level_id = ?',
    [id]
  );

  if (priceCheck[0].count > 0) {
    throw new Error('Cannot delete quality level: it is referenced by product prices');
  }

  const [result] = await pool.query(
    'DELETE FROM quality_levels WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
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