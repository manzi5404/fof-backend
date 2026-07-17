const { pool } = require('../db/connection');

async function getQualityPricesByProductId(productId) {
  const result = await pool.query(
    `SELECT qp.product_id, qp.quality_level_id, qp.price, ql.name as quality_name, ql.description as quality_description, ql.sort_order
     FROM product_quality_prices qp
     JOIN quality_levels ql ON qp.quality_level_id = ql.id
     WHERE qp.product_id = $1
     ORDER BY ql.sort_order ASC`,
    [productId]
  );
  return result.rows;
}

async function getQualityPricesByProductIdAdmin(productId) {
  const result = await pool.query(
    `SELECT qp.*, ql.name as quality_name, ql.description as quality_description, ql.sort_order
     FROM product_quality_prices qp
     JOIN quality_levels ql ON qp.quality_level_id = ql.id
     WHERE qp.product_id = $1
     ORDER BY ql.sort_order ASC`,
    [productId]
  );
  return result.rows;
}

async function getQualityPrice(productId, qualityLevelId) {
  const result = await pool.query(
    `SELECT qp.*, ql.name as quality_name
     FROM product_quality_prices qp
     JOIN quality_levels ql ON qp.quality_level_id = ql.id
     WHERE qp.product_id = $1 AND qp.quality_level_id = $2 AND qp.is_active = true AND ql.is_active = true`,
    [productId, qualityLevelId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function getActiveQualityPrice(productId, qualityLevelId) {
  return getQualityPrice(productId, qualityLevelId);
}

async function setQualityPrice(productId, qualityLevelId, price) {
  const result = await pool.query(
    `INSERT INTO product_quality_prices (product_id, quality_level_id, price)
     VALUES ($1, $2, $3)
     ON CONFLICT (product_id, quality_level_id) DO UPDATE SET price = $3, is_active = true
     RETURNING id`,
    [productId, qualityLevelId, price]
  );
  return result.rows[0].id;
}

async function batchSetQualityPrices(productId, prices) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE product_quality_prices SET is_active = false WHERE product_id = $1',
      [productId]
    );

    for (const item of prices) {
      if (item.price !== null && item.price !== undefined && item.price > 0) {
        await client.query(
          `INSERT INTO product_quality_prices (product_id, quality_level_id, price, is_active)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (product_id, quality_level_id) DO UPDATE SET price = $3, is_active = true`,
          [productId, item.quality_level_id, item.price]
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteQualityPrice(productId, qualityLevelId) {
  const result = await pool.query(
    'UPDATE product_quality_prices SET is_active = false WHERE product_id = $1 AND quality_level_id = $2',
    [productId, qualityLevelId]
  );
  return result.rowCount > 0;
}

async function deleteAllQualityPrices(productId) {
  const result = await pool.query(
    'DELETE FROM product_quality_prices WHERE product_id = $1',
    [productId]
  );
  return result.rowCount > 0;
}

async function getQualityPricesForProducts(productIds) {
  if (!productIds || productIds.length === 0) return {};

  const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
  const result = await pool.query(
    `SELECT qp.product_id, qp.quality_level_id, qp.price, ql.name as quality_name, ql.sort_order
     FROM product_quality_prices qp
     JOIN quality_levels ql ON qp.quality_level_id = ql.id
     WHERE qp.product_id IN (${placeholders})
     ORDER BY qp.product_id, ql.sort_order ASC`,
    productIds
  );

  const res = {};
  for (const row of result.rows) {
    if (!res[row.product_id]) {
      res[row.product_id] = [];
    }
    res[row.product_id].push(row);
  }

  return res;
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