const express = require('express');
const productController = require('../controllers/product.controller');

const router = express.Router();

router.get('/', productController.getProducts);
router.get('/slug/:slug', productController.getProductBySlug);
router.get('/id/:id', productController.getProductById);

module.exports = router;
