const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { verifyAdmin } = require('../middleware/authMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/google', authController.googleLogin);
router.post('/logout', authController.logout);
router.get('/verify', verifyAdmin, authController.verify);


module.exports = router;
