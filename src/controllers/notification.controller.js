const { requireAuth } = require('../middleware/auth');
const notificationService = require('../services/notification.service');
const { handleServiceError } = require('../utils/responseHandler');

async function getNotifications(req, res) {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const notifications = await notificationService.getUserNotifications(req.user.id, limit, offset);
    const unreadCount = await notificationService.getUnreadCount(req.user.id);

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getUnreadCount(req, res) {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return res.status(200).json({ success: true, count });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function markAllRead(req, res) {
  try {
    const count = await notificationService.markAllAsRead(req.user.id);
    return res.status(200).json({
      success: true,
      message: `Marked ${count} notifications as read`,
    });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function markRead(req, res) {
  try {
    const success = await notificationService.markAsRead(req.params.id, req.user.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    return res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
};
