const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const notificationService = require('../services/notification.service');
const { handleServiceError } = require('../utils/responseHandler');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const unseen = req.query.unseen === 'true';

    let notifications;
    if (unseen) {
      notifications = await notificationService.getUnreadNotificationsForAdmin(req.user.id, limit, offset);
    } else {
      notifications = await notificationService.getUserNotifications(req.user.id, limit, offset);
    }

    return res.status(200).json({ success: true, notifications });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
});

router.get('/count', requireAuth, requireAdmin, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return res.status(200).json({ success: true, count });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type, message } = req.body;
    const count = await notificationService.createForAdmins(type, message);
    return res.status(201).json({ success: true, message: `Notification sent to ${count} admins` });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
});

router.patch('/:id/seen', requireAuth, requireAdmin, async (req, res) => {
  try {
    const success = await notificationService.markAsRead(req.params.id, req.user.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    return res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
});

router.post('/seen-all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const count = await notificationService.markAllAsRead(req.user.id);
    return res.status(200).json({ success: true, message: `Marked ${count} notifications as read` });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
});

module.exports = router;
