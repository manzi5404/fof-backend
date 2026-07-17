const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/authMiddleware');
const {
    submitContactForm,
    getMessages,
    getMessageById,
    updateMessageStatus
} = require('../controllers/contactController');

// Public route for submitting contact form
router.post('/', submitContactForm);

// Admin routes
router.get('/', verifyAdmin, getMessages);
router.get('/:id', verifyAdmin, getMessageById);
router.patch('/:id', verifyAdmin, updateMessageStatus);

module.exports = router;