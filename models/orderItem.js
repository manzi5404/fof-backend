const { pool } = require('../db/connection');

async function addOrderItem(conn, orderId, productId, productName, quantity, priceAtPurchase, totalPrice, size, color, qualityLevelId) {
  const db = conn || pool;
  const result = await db.query(
    `INSERT INTO order_items (order_id, product_id, product_name, quantity, size, color, quality_level_id, price_at_purchase, total_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [orderId, productId, productName, quantity, size, color, qualityLevelId, priceAtPurchase, totalPrice]
  );
  return result.rows[0].id;
}

module.exports = { addOrderItem };