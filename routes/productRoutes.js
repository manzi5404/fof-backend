const express = require('express');
const router = express.Router();
const { protect, verifyAdmin } = require('../middleware/authMiddleware');
const productController = require('../controllers/productController');

router.post('/', protect, verifyAdmin, productController.addProduct);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);
router.put('/:id', protect, verifyAdmin, productController.editProduct);
router.delete('/:id', protect, verifyAdmin, productController.removeProduct);

module.exports = router;
