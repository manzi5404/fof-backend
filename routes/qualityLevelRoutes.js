const express = require('express');
const router = express.Router();
const qualityLevelController = require('../controllers/qualityLevelController');

router.get('/', qualityLevelController.getQualityLevels);
router.get('/:id', qualityLevelController.getQualityLevelById);
router.post('/', qualityLevelController.createQualityLevel);
router.put('/:id', qualityLevelController.updateQualityLevel);
router.delete('/:id', qualityLevelController.deleteQualityLevel);

module.exports = router;
