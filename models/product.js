const { pool } = require('../db/connection');
const qualityPriceService = require('./productQualityPrice');

async function createProduct(product) {
  const { drop_id, name, description, price, sizes, colors, image_urls, is_active, quality_prices } = product;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO products (drop_id, name, description, price, sizes, colors, image_urls, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
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

    const productId = result.rows[0].id;

    if (quality_prices && Array.isArray(quality_prices) && quality_prices.length > 0) {
      for (const qp of quality_prices) {
        if (!qp.quality_level_id || qp.price === undefined || qp.price === null || qp.price <= 0) {
          continue;
        }

        await client.query(
          'INSERT INTO product_quality_prices (product_id, quality_level_id, price, is_active) VALUES ($1, $2, $3, 1)',
          [productId, qp.quality_level_id, qp.price]
        );
      }
    }

    await client.query('COMMIT');
    return productId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function safeParseJSON(value) {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

async function getProductsByDropId(dropId) {
  const result = await pool.query('SELECT * FROM products WHERE drop_id = $1', [dropId]);
  const products = result.rows.map(row => ({
    ...row,
    sizes: safeParseJSON(row.sizes) || [],
    colors: safeParseJSON(row.colors) || [],
    image_urls: safeParseJSON(row.image_urls) || []
  }));

  const productIds = products.map(p => p.id);
  const qualityPrices = await qualityPriceService.getQualityPricesForProducts(productIds);

  return products.map(product => ({
    ...product,
    quality_prices: qualityPrices[product.id] || []
  }));
}

async function getProductById(id) {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const product = {
    ...row,
    sizes: safeParseJSON(row.sizes) || [],
    colors: safeParseJSON(row.colors) || [],
    image_urls: safeParseJSON(row.image_urls) || []
  };

  const qualityPrices = await qualityPriceService.getQualityPricesByProductId(id);
  product.quality_prices = qualityPrices;

  return product;
}

async function getAllProducts() {
  const result = await pool.query('SELECT * FROM products');
  const products = result.rows.map(row => ({
    ...row,
    sizes: safeParseJSON(row.sizes) || [],
    colors: safeParseJSON(row.colors) || [],
    image_urls: safeParseJSON(row.image_urls) || []
  }));

  const productIds = products.map(p => p.id);
  const qualityPrices = await qualityPriceService.getQualityPricesForProducts(productIds);

  return products.map(product => ({
    ...product,
    quality_prices: qualityPrices[product.id] || []
  }));
}

async function updateProduct(id, product) {
  const { name, description, price, sizes, colors, image_urls, is_active, quality_prices } = product;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE products SET name = $1, description = $2, price = $3, sizes = $4, colors = $5, image_urls = $6, is_active = $7 WHERE id = $8',
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

    if (quality_prices && Array.isArray(quality_prices)) {
      await client.query(
        'UPDATE product_quality_prices SET is_active = 0 WHERE product_id = $1',
        [id]
      );

      for (const qp of quality_prices) {
        if (!qp.quality_level_id || qp.price === undefined || qp.price === null || qp.price <= 0) {
          continue;
        }

        await client.query(
          `INSERT INTO product_quality_prices (product_id, quality_level_id, price, is_active)
           VALUES ($1, $2, $3, 1)
           ON CONFLICT (product_id, quality_level_id) DO UPDATE SET price = $3, is_active = 1`,
          [id, qp.quality_level_id, qp.price]
        );
      }
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteProduct(id) {
  const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = {
  createProduct,
  getProductsByDropId,
  getProductById,
  getAllProducts,
  updateProduct,
  deleteProduct
};