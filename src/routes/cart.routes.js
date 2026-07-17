const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const cartController = require('../controllers/cart.controller');

const router = express.Router();

router.use(apiLimiter);

router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, cartController.addItem);
router.put('/items/:variantId', optionalAuth, cartController.updateItem);
router.delete('/items/:variantId', optionalAuth, cartController.removeItem);
router.delete('/', optionalAuth, cartController.clearCartItems);

module.exports = router;
