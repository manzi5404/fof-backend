const express = require('express');
const router = express.Router();
const { getLatestAnnouncement, updateAnnouncement, streamAnnouncements } = require('../controllers/announcementController');

router.get('/', getLatestAnnouncement);
router.get('/stream', streamAnnouncements);
router.put('/', updateAnnouncement);

module.exports = router;
