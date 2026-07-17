const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const orderController = require('../controllers/order.controller');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, orderController.getAllOrders);
router.put('/:id/status', requireAuth, requireAdmin, orderController.updateOrderStatus);
router.post('/:id/cancel', requireAuth, requireAdmin, orderController.cancelOrder);

module.exports = router;
