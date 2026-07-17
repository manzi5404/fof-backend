const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const dropController = require('../controllers/drop.controller');

const router = express.Router();

router.post('/', requireAuth, requireAdmin, dropController.createDrop);
router.put('/:id', requireAuth, requireAdmin, dropController.updateDrop);
router.delete('/:id', requireAuth, requireAdmin, dropController.deleteDrop);
router.post('/:id/activate', requireAuth, requireAdmin, dropController.activateDrop);

module.exports = router;
