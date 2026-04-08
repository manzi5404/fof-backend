const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/authMiddleware');
const {
    getNotifications,
    markAsSeen,
    markAllSeen,
    getUnseenCount
} = require('../controllers/notificationController');

// All notification routes are admin-only
router.get('/', verifyAdmin, getNotifications);
router.get('/count', verifyAdmin, getUnseenCount);
router.patch('/:id/seen', verifyAdmin, markAsSeen);
router.post('/seen-all', verifyAdmin, markAllSeen);

module.exports = router;