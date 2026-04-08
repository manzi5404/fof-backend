const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { verifyAdmin } = require('../middleware/authMiddleware');

// Administrative Authorization for All Routes in This Sub-Router
router.use(verifyAdmin);

// Administrative Management Routes
router.get('/', reservationController.getReservations);
router.patch('/:id/status', reservationController.updateReservationStatus);
router.delete('/:id', reservationController.deleteReservation);

module.exports = router;
