const express = require('express');
const collectionController = require('../controllers/collection.controller');

const router = express.Router();

router.get('/', collectionController.getCollections);
router.get('/:slug', collectionController.getCollectionBySlug);

module.exports = router;
