const notificationRepo = require('../repositories/notification.repository');
const userRepo = require('../repositories/user.repository');
const { events } = require('../events');
const { ValidationError } = require('../utils/errors');

async function createForUser(userId, type, message) {
  if (!userId) {
    throw new ValidationError('userId is required');
  }
  if (!message) {
    throw new ValidationError('message is required');
  }

  const notification = await notificationRepo.create(userId, type, message);
  events.emit(events.NOTIFICATION_CREATED, { notification });
  return notification;
}

async function createForAdmins(type, message) {
  if (!message) {
    throw new ValidationError('message is required');
  }

  const admins = await userRepo.findAdmins();
  for (const admin of admins) {
    const notification = await notificationRepo.create(admin.id, type, message);
    events.emit(events.NOTIFICATION_CREATED, { notification });
  }

  return admins.length;
}

async function markAsRead(id, userId) {
  return notificationRepo.markRead(id, userId);
}

async function markAllAsRead(userId) {
  return notificationRepo.markAllRead(userId);
}

async function getUnreadCount(userId) {
  return notificationRepo.unreadCount(userId);
}

async function getUnreadNotificationsForAdmin(userId, limit = 50, offset = 0) {
  return notificationRepo.findByUserIdAndUnread(userId, limit, offset);
}

async function getUserNotifications(userId, limit = 50, offset = 0) {
  return notificationRepo.findByUserId(userId, limit, offset);
}

module.exports = {
  createForUser,
  createForAdmins,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getUnreadNotificationsForAdmin,
  getUserNotifications,
};
