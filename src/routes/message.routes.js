const express = require('express');
const messageController = require('../controllers/message.controller');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

router.post('/', messageController.createMessage);
router.get('/', requireAuth, requireAdmin, messageController.getMessages);
router.get('/:id', requireAuth, requireAdmin, messageController.getMessage);
router.patch('/:id', requireAuth, requireAdmin, messageController.updateMessageStatus);

module.exports = router;
