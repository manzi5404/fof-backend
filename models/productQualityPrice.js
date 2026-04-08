const { pool } = require('../db/connection');

/**
 * Get all quality prices for a specific product
 * @param {number} productId - Product ID
 * @returns {Promise<Array>} Array of quality prices with level details
 */
async function getQualityPricesByProductId(productId) {
  const [rows] = await pool.query(
    `SELECT qp.product_id, qp.quality_level_id, qp.price, ql.name as quality_name, ql.description as quality_description, ql.sort_order
     FROM product_quality_prices qp
     JOIN quality_levels ql ON qp.quality_level_id = ql.id
     WHERE qp.product_id = ?
     ORDER BY ql.sort_order ASC`,
    [productId]
  );
  return rows;
}

/**
 * Get all quality prices for a product (including inactive) - for admin
 * @param {number} productId - Product ID
 * @returns {Promise<Array>} Array of all quality prices
 */
async function getQualityPricesByProductIdAdmin(productId) {
  const [rows] = await pool.query(
    `SELECT qp.*, ql.name as quality_name, ql.description as quality_description, ql.sort_order
     FROM product_quality_prices qp
     JOIN quality_levels ql ON qp.quality_level_id = ql.id
     WHERE qp.product_id = ?
     ORDER BY ql.sort_order ASC`,
    [productId]
  );
  return rows;
}

/**
 * Get a specific quality price for a product
 * @param {number} productId - Product ID
 * @param {number} qualityLevelId - Quality Level ID
 * @returns {Promise<Object|null>} Price object or null
 */
async function getQualityPrice(productId, qualityLevelId) {
  const [rows] = await pool.query(
    `SELECT qp.*, ql.name as quality_name
     FROM product_quality_prices qp
     JOIN quality_levels ql ON qp.quality_level_id = ql.id
     WHERE qp.product_id = ? AND qp.quality_level_id = ? AND qp.is_active = 1 AND ql.is_active = 1`,
    [productId, qualityLevelId]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function getActiveQualityPrice(productId, qualityLevelId) {
  return getQualityPrice(productId, qualityLevelId);
}

/**
 * Set or update a quality price for a product
 * Uses INSERT ... ON DUPLICATE KEY UPDATE for upsert
 * @param {number} productId - Product ID
 * @param {number} qualityLevelId - Quality Level ID
 * @param {number} price - Price amount
 * @returns {Promise<number>} Inserted/Updated ID
 */
async function setQualityPrice(productId, qualityLevelId, price) {
  const [result] = await pool.query(
    `INSERT INTO product_quality_prices (product_id, quality_level_id, price)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE price = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP`,
    [productId, qualityLevelId, price, price]
  );
  return result.insertId;
}

/**
 * Batch set quality prices for a product
 * @param {number} productId - Product ID
 * @param {Array} prices - Array of { quality_level_id, price }
 * @returns {Promise<void>}
 */
async function batchSetQualityPrices(productId, prices) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // First, deactivate all existing prices for this product
    await connection.query(
      'UPDATE product_quality_prices SET is_active = 0 WHERE product_id = ?',
      [productId]
    );

    // Then insert/update the new prices
    for (const item of prices) {
      if (item.price !== null && item.price !== undefined && item.price > 0) {
        await connection.query(
          `INSERT INTO product_quality_prices (product_id, quality_level_id, price, is_active)
           VALUES (?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE price = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP`,
          [productId, item.quality_level_id, item.price, item.price]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Delete a quality price (soft delete)
 * @param {number} productId - Product ID
 * @param {number} qualityLevelId - Quality Level ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteQualityPrice(productId, qualityLevelId) {
  const [result] = await pool.query(
    'UPDATE product_quality_prices SET is_active = 0 WHERE product_id = ? AND quality_level_id = ?',
    [productId, qualityLevelId]
  );
  return result.affectedRows > 0;
}

/**
 * Delete all quality prices for a product
 * @param {number} productId - Product ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteAllQualityPrices(productId) {
  const [result] = await pool.query(
    'DELETE FROM product_quality_prices WHERE product_id = ?',
    [productId]
  );
  return result.affectedRows > 0;
}

/**
 * Get products with their quality prices (for batch operations)
 * @param {Array} productIds - Array of product IDs
 * @returns {Promise<Object>} Object keyed by product_id with array of prices
 */
async function getQualityPricesForProducts(productIds) {
  if (!productIds || productIds.length === 0) return {};

  const placeholders = productIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT qp.product_id, qp.quality_level_id, qp.price, ql.name as quality_name, ql.sort_order
     FROM product_quality_prices qp
     JOIN quality_levels ql ON qp.quality_level_id = ql.id
     WHERE qp.product_id IN (${placeholders})
     ORDER BY qp.product_id, ql.sort_order ASC`,
    productIds
  );

  // Group by product_id
  const result = {};
  for (const row of rows) {
    if (!result[row.product_id]) {
      result[row.product_id] = [];
    }
    result[row.product_id].push(row);
  }

  return result;
}

module.exports = {
  getQualityPricesByProductId,
  getQualityPricesByProductIdAdmin,
  getQualityPrice,
  getActiveQualityPrice,
  setQualityPrice,
  batchSetQualityPrices,
  deleteQualityPrice,
  deleteAllQualityPrices,
  getQualityPricesForProducts
};