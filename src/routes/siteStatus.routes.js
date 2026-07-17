const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const siteStatusController = require('../controllers/siteStatus.controller');

const router = express.Router();

// Admin-only broadcast
router.post('/broadcast', requireAuth, requireAdmin, siteStatusController.broadcastSubscribers);

module.exports = router;

