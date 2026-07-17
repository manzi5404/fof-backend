const express = require('express');
const dropController = require('../controllers/drop.controller');

const router = express.Router();

router.get('/active', dropController.getActiveDrop);
router.get('/', dropController.getAllDrops);
router.get('/:slug', dropController.getDropBySlug);

module.exports = router;
