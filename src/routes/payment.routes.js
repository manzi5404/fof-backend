const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

router.post('/verify', requireAuth, requireAdmin, paymentController.verifyPayment);

module.exports = router;
