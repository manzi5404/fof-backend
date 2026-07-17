const productService = require('../models/product');

const ALLOWED_PRODUCT_FIELDS = [
  'drop_id',
  'name',
  'description',
  'price',
  'sizes',
  'colors',
  'image_urls',
  'is_active',
  'quality_prices'
];

function sanitizeProductInput(body) {
  const product = {};
  let hasAllowedField = false;
  ALLOWED_PRODUCT_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      product[field] = body[field];
      hasAllowedField = true;
    }
  });
  return hasAllowedField ? product : null;
}

async function addProduct(req, res) {
    try {
        const product = sanitizeProductInput(req.body);
        if (!product) {
            return res.status(400).json({ success: false, message: 'No valid product fields provided' });
        }
        if (!product.name || !product.price) {
            return res.status(400).json({ success: false, message: 'name and price are required' });
        }
        const productId = await productService.createProduct(product);
        res.json({ success: true, productId });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function getProducts(req, res) {
    try {
        const { dropId } = req.query;
        let products;
        if (dropId) {
            products = await productService.getProductsByDropId(dropId);
        } else {
            products = await productService.getAllProducts();
        }
        res.json({ success: true, products });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function getProduct(req, res) {
    try {
        const product = await productService.getProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, product });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function editProduct(req, res) {
    try {
        const product = sanitizeProductInput(req.body);
        if (!product) {
            return res.status(400).json({ success: false, message: 'No valid product fields provided' });
        }
        const updated = await productService.updateProduct(req.params.id, product);
        res.json({ success: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function removeProduct(req, res) {
    try {
        const removed = await productService.deleteProduct(req.params.id);
        res.json({ success: removed });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

module.exports = {
    addProduct,
    getProducts,
    getProduct,
    editProduct,
    removeProduct
};
