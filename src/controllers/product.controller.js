const productService = require('../services/product.service');
const { handleServiceError } = require('../utils/responseHandler');

async function getProducts(req, res) {
  try {
    const { dropId } = req.query;
    let products;
    if (dropId) {
      products = await productService.getProductsByDrop(dropId);
    } else {
      const activeDrop = await require('../services/drop.service').getActiveDrop();
      if (activeDrop) {
        products = await productService.getProductsByDrop(activeDrop.id);
      } else {
        products = [];
      }
    }
    return res.status(200).json({ success: true, products });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getProductBySlug(req, res) {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    return res.status(200).json({ success: true, product });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getProductById(req, res) {
  try {
    const product = await productService.getProductById(req.params.id);
    return res.status(200).json({ success: true, product });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function createProduct(req, res) {
  try {
    const product = await productService.createProduct(req.body);
    return res.status(201).json({ success: true, product });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function updateProduct(req, res) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return res.status(200).json({ success: true, product });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function deleteProduct(req, res) {
  try {
    await productService.softDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

module.exports = {
  getProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
