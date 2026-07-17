const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const collectionController = require('../controllers/collection.controller');

const router = express.Router();

router.post('/', requireAuth, requireAdmin, collectionController.createCollection);
router.put('/:id', requireAuth, requireAdmin, collectionController.updateCollection);
router.delete('/:id', requireAuth, requireAdmin, collectionController.deleteCollection);

router.post('/:id/drops', requireAuth, requireAdmin, collectionController.addDrop);
router.delete('/:id/drops/:dropId', requireAuth, requireAdmin, collectionController.removeDrop);

module.exports = router;
