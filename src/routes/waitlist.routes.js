const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const waitlistController = require('../controllers/waitlist.controller');

const router = express.Router();

router.post('/', waitlistController.addToWaitlist);
router.get('/', requireAuth, requireAdmin, waitlistController.getAllForAdmin);

module.exports = router;
