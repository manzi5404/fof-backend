const express = require('express');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');
const { checkoutLimiter } = require('../middleware/rateLimiter');
const orderController = require('../controllers/order.controller');

const router = express.Router();

router.post('/', optionalAuth, orderController.createOrder);
router.get('/my', requireAuth, orderController.getMyOrders);
router.get('/:id', optionalAuth, orderController.getOrderById);
router.put('/:id/status', requireAuth, requireAdmin, orderController.updateOrderStatus);

router.get('/', requireAuth, requireAdmin, orderController.getAllOrders);

module.exports = router;
