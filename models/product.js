const { pool } = require('../db/connection');
const qualityPriceService = require('./productQualityPrice');

async function createProduct(product) {
  const { drop_id, name, description, price, sizes, colors, image_urls, is_active, quality_prices } = product;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Insert the product
    const [result] = await connection.query(
      'INSERT INTO products (drop_id, name, description, price, sizes, colors, image_urls, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        drop_id,
        name,
        description,
        price,
        JSON.stringify(sizes || []),
        JSON.stringify(colors || []),
        JSON.stringify(image_urls || []),
        is_active ? 1 : 0
      ]
    );

    const productId = result.insertId;

    // If quality prices are provided, validate and insert them
    if (quality_prices && Array.isArray(quality_prices) && quality_prices.length > 0) {
      for (const qp of quality_prices) {
        if (!qp.quality_level_id || qp.price === undefined || qp.price === null || qp.price <= 0) {
          continue;
        }

        await connection.query(
          'INSERT INTO product_quality_prices (product_id, quality_level_id, price, is_active) VALUES (?, ?, ?, 1)',
          [productId, qp.quality_level_id, qp.price]
        );
      }
    }

    await connection.commit();
    return productId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getProductsByDropId(dropId) {
  const [rows] = await pool.query('SELECT * FROM products WHERE drop_id = ?', [dropId]);
  const products = rows.map(row => ({
    ...row,
    sizes: typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes,
    colors: typeof row.colors === 'string' ? JSON.parse(row.colors) : row.colors,
    image_urls: typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls
  }));

  // Fetch quality prices for all products
  const productIds = products.map(p => p.id);
  const qualityPrices = await qualityPriceService.getQualityPricesForProducts(productIds);

  // Attach quality prices to each product
  return products.map(product => ({
    ...product,
    quality_prices: qualityPrices[product.id] || []
  }));
}

async function getProductById(id) {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  const row = rows[0];
  const product = {
    ...row,
    sizes: typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes,
    colors: typeof row.colors === 'string' ? JSON.parse(row.colors) : row.colors,
    image_urls: typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls
  };

  // Fetch quality prices for this product
  const qualityPrices = await qualityPriceService.getQualityPricesByProductId(id);
  product.quality_prices = qualityPrices;

  return product;
}

async function getAllProducts() {
  const [rows] = await pool.query('SELECT * FROM products');
  const products = rows.map(row => ({
    ...row,
    sizes: typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes,
    colors: typeof row.colors === 'string' ? JSON.parse(row.colors) : row.colors,
    image_urls: typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls
  }));

  // Fetch quality prices for all products
  const productIds = products.map(p => p.id);
  const qualityPrices = await qualityPriceService.getQualityPricesForProducts(productIds);

  // Attach quality prices to each product
  return products.map(product => ({
    ...product,
    quality_prices: qualityPrices[product.id] || []
  }));
}

async function updateProduct(id, product) {
  const { name, description, price, sizes, colors, image_urls, is_active, quality_prices } = product;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update the product
    const [result] = await connection.query(
      'UPDATE products SET name = ?, description = ?, price = ?, sizes = ?, colors = ?, image_urls = ?, is_active = ? WHERE id = ?',
      [
        name,
        description,
        price,
        JSON.stringify(sizes || []),
        JSON.stringify(colors || []),
        JSON.stringify(image_urls || []),
        is_active ? 1 : 0,
        id
      ]
    );

    // If quality prices are provided, update them
    if (quality_prices && Array.isArray(quality_prices)) {
      // Deactivate all existing prices first
      await connection.query(
        'UPDATE product_quality_prices SET is_active = 0 WHERE product_id = ?',
        [id]
      );

      // Insert/update the new prices
      for (const qp of quality_prices) {
        if (!qp.quality_level_id || qp.price === undefined || qp.price === null || qp.price <= 0) {
          continue;
        }

        await connection.query(
          `INSERT INTO product_quality_prices (product_id, quality_level_id, price, is_active)
           VALUES (?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE price = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP`,
          [id, qp.quality_level_id, qp.price, qp.price]
        );
      }
    }

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteProduct(id) {
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createProduct,
  getProductsByDropId,
  getProductById,
  getAllProducts,
  updateProduct,
  deleteProduct
};