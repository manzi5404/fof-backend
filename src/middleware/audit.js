const auditService = require('../services/audit.service');

function audit(action, entityType, getEntityId) {
  return (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;

    let responseBody = null;
    let handled = false;

    res.send = function (body) {
      if (!handled) {
        handled = true;
        const statusCode = res.statusCode || 200;
        if (statusCode >= 200 && statusCode < 300) {
          const entityId = getEntityId ? getEntityId(req, body) : null;
          auditService.logAction({
            userId: req.user?.id || null,
            action,
            entityType,
            entityId,
            req,
          }).catch((err) => {
            console.error('Audit log failed (non-blocking):', err);
          });
        }
      }
      return originalSend.call(this, body);
    };

    res.json = function (obj) {
      if (!handled) {
        handled = true;
        const statusCode = res.statusCode || 200;
        if (statusCode >= 200 && statusCode < 300) {
          const entityId = getEntityId ? getEntityId(req, obj) : null;
          auditService.logAction({
            userId: req.user?.id || null,
            action,
            entityType,
            entityId,
            req,
          }).catch((err) => {
            console.error('Audit log failed (non-blocking):', err);
          });
        }
      }
      return originalJson.call(this, obj);
    };

    next();
  };
}

function auditAuth(action) {
  return audit(action, 'auth', () => null);
}

function auditDrop(action) {
  return audit(action, 'drop', (req) => req.params.id || req.body.id);
}

function auditProduct(action) {
  return audit(action, 'product', (req) => req.params.id || req.params.slug);
}

function auditInventory(action) {
  return audit(action, 'inventory', (req) => req.params.variantId || req.body.variantId);
}

function auditOrder(action) {
  return audit(action, 'order', (req) => req.params.id || req.body.orderId);
}

function auditPayment(action) {
  return audit(action, 'payment', (req) => req.body.orderId || req.params.orderId);
}

module.exports = {
  audit,
  auditAuth,
  auditDrop,
  auditProduct,
  auditInventory,
  auditOrder,
  auditPayment,
};
