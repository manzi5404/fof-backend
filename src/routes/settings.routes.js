const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const settingsController = require('../controllers/settings.controller');

const router = express.Router();

// Public read
router.get('/', settingsController.getSettings);

// Admin write
router.put('/', requireAuth, requireAdmin, settingsController.updateSetting);

module.exports = router;

