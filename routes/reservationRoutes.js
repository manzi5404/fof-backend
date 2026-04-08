const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { protect, verifyAdmin } = require('../middleware/authMiddleware');

// Public/User Routes
router.post('/', protect, reservationController.createReservation);

module.exports = router;
