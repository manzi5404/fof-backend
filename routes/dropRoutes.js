const express = require('express');
const router = express.Router();
const { protect, verifyAdmin } = require('../middleware/authMiddleware');
const { createDrop, listDrops, updateDrop, removeDrop } = require('../controllers/dropController');

router.post('/', protect, verifyAdmin, createDrop);
router.get('/', listDrops);
router.put('/:id', protect, verifyAdmin, updateDrop);
router.delete('/:id', protect, verifyAdmin, removeDrop);

module.exports = router;

