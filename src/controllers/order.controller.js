const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const orderService = require('../services/order.service');
const variantRepo = require('../repositories/variant.repository');
const { handleServiceError } = require('../utils/responseHandler');

async function createOrder(req, res) {
  try {
    const customerData = {
      customer_name: req.body.customer_name,
      customer_email: req.body.customer_email,
      customer_phone: req.body.customer_phone,
      shipping_address: req.body.shipping_address,
      payment_method: req.body.payment_method || 'reservation',
    };

    const userId = req.user ? req.user.id : null;
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || null;

    let order;
    if (req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0) {
      order = await orderService.createDirect(userId, customerData, req.body.items, sessionId);
    } else if (req.body.product_id && req.body.size) {
      const variants = await variantRepo.findByProductId(req.body.product_id);
      const variant = variants.find(v => v.size === req.body.size && (!req.body.color || v.color === req.body.color)) || variants[0];
      if (!variant) {
        return res.status(400).json({ success: false, error: 'Selected size/color combination is not available' });
      }
      const qty = Number(req.body.quantity) || 1;
      order = await orderService.createDirect(userId, customerData, [{
        variantId: variant.id,
        quantity: qty,
      }], sessionId);
    } else {
      order = await orderService.createFromCart(userId, customerData, sessionId);
    }

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        total_amount: order.total_price,
        created_at: order.created_at,
        items: (order.order_items || []).map((item) => ({
          product_name: item.product_name,
          size: item.size,
          color: item.color,
          unit_price: item.price_at_purchase,
          quantity: item.quantity,
          subtotal: item.total_price,
        })),
      },
    });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getMyOrders(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const orders = await orderService.getMyOrders(req.user.id);
    return res.status(200).json({ success: true, orders });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getOrderById(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const order = await orderService.getOrderById(req.params.id, userId);
    return res.status(200).json({ success: true, order });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getAllOrders(req, res) {
  try {
    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const orders = await orderService.getAllOrders(filters);
    return res.status(200).json({ success: true, orders });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function updateOrderStatus(req, res) {
  console.log('[ORDER STATUS UPDATE] Request received:', {
    method: req.method,
    url: req.url,
    params: req.params,
    body: req.body,
    user: req.user ? { id: req.user.id, role: req.user.role } : null,
  });

  try {
    const { status } = req.body;
    if (!status) {
      console.error('[ORDER STATUS UPDATE] Missing status in request body');
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    console.log('[ORDER STATUS UPDATE] Calling transitionStatus for order:', req.params.id, 'new status:', status);
    const order = await orderService.transitionStatus(req.params.id, status);
    console.log('[ORDER STATUS UPDATE] Success:', order.id, order.status);

    return res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('[ORDER STATUS UPDATE] Error:', err.message, err.stack);
    return handleServiceError(res, err, req);
  }
}

async function cancelOrder(req, res) {
  try {
    const order = await orderService.cancelOrder(req.params.id);
    return res.status(200).json({ success: true, order });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
};
