const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// POST /api/orders - Create a new order (reservation or MoMo payment)
router.post('/', orderController.createOrder);

// GET /api/orders/my - Get current user's orders
router.get('/my', orderController.getMyOrders);

// GET /api/orders - Admin: get all orders
router.get('/', orderController.getAllOrders);

// PUT /api/orders/:id/status - Admin: update order status
router.put('/:id/status', orderController.updateStatus);

module.exports = router;
