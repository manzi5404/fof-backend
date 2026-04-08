const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/authMiddleware');

// Controllers
const productController = require('../controllers/productController');
const dropController = require('../controllers/dropController');
const orderController = require('../controllers/orderController');
const storeConfigController = require('../controllers/storeConfigController');
const reservationController = require('../controllers/reservationController');
const announcementController = require('../controllers/announcementController');
const contactController = require('../controllers/contactController');

// Existing Sub-Routers
const notificationRoutes = require('./notificationRoutes');
const dropRoutes = require('./dropRoutes');
const productRoutes = require('./productRoutes');
const adminReservationRoutes = require('./adminReservationRoutes');
const qualityLevelRoutes = require('./qualityLevelRoutes');

// Apply verifyAdmin to ALL routes in this router
router.use(verifyAdmin);

// Core Modules
router.use('/drops', dropRoutes);
router.use('/products', productRoutes);
router.use('/notifications', notificationRoutes);
router.use('/quality-levels', qualityLevelRoutes);

// Orders
router.get('/orders', orderController.getAllOrders);
router.put('/orders/:id/status', orderController.updateStatus);

// Reservations
router.use('/reservations', adminReservationRoutes);

// Store Config & Settings
router.get('/store-config', storeConfigController.getStoreConfig);
router.put('/store-config', storeConfigController.updateStoreConfig);
router.use('/settings', require('./settingsRoutes'));

// Announcements
router.get('/announcement', announcementController.getLatestAnnouncement);
router.put('/announcement', announcementController.updateAnnouncement);

// Messages (Admin subset)
router.get('/messages', contactController.getMessages);
router.get('/messages/:id', contactController.getMessageById);
router.patch('/messages/:id', contactController.updateMessageStatus);

// Verification
router.get('/auth-verify', (req, res) => res.json({ success: true, user: req.user }));

module.exports = router;
