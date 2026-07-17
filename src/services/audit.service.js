const auditRepo = require('../repositories/audit.repository');

async function logAction({ userId, action, entityType, entityId, oldValues, newValues, req }) {
  const ipAddress = req ? (req.ip || req.connection.remoteAddress || null) : null;
  const userAgent = req ? req.get('user-agent') || null : null;

  return auditRepo.create({
    userId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
  });
}

async function logAuth(userId, action, req) {
  return logAction({
    userId,
    action,
    entityType: 'auth',
    entityId: userId,
    req,
  });
}

async function logDropChange(userId, action, dropId, oldValues, newValues, req) {
  return logAction({
    userId,
    action,
    entityType: 'drop',
    entityId: dropId,
    oldValues,
    newValues,
    req,
  });
}

async function logProductChange(userId, action, productId, oldValues, newValues, req) {
  return logAction({
    userId,
    action,
    entityType: 'product',
    entityId: productId,
    oldValues,
    newValues,
    req,
  });
}

async function logInventoryChange({ userId, variantId, orderId, adminId, changeAmount, previousStock, newStock, reason, req }) {
  return auditRepo.create({
    userId,
    action: 'inventory_adjusted',
    entityType: 'product_variant',
    entityId: variantId,
    oldValues: { stock: previousStock, orderId, adminId, changeAmount, reason },
    newValues: { stock: newStock },
    ipAddress: req ? (req.ip || req.connection.remoteAddress || null) : null,
    userAgent: req ? req.get('user-agent') || null : null,
  });
}

async function logOrderChange(userId, action, orderId, oldValues, newValues, req) {
  return logAction({
    userId,
    action,
    entityType: 'order',
    entityId: orderId,
    oldValues,
    newValues,
    req,
  });
}

async function logPaymentVerification(userId, action, orderId, oldValues, newValues, req) {
  return logAction({
    userId,
    action,
    entityType: 'payment_verification',
    entityId: orderId,
    oldValues,
    newValues,
    req,
  });
}

async function getAuditLogs(filters = {}, limit = 100, offset = 0) {
  return auditRepo.findAll(filters, limit, offset);
}

async function getEntityHistory(entityType, entityId, limit = 50) {
  return auditRepo.findByEntity(entityType, entityId, limit);
}

module.exports = {
  logAction,
  logAuth,
  logDropChange,
  logProductChange,
  logInventoryChange,
  logOrderChange,
  logPaymentVerification,
  getAuditLogs,
  getEntityHistory,
};
