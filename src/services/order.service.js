const orderRepo = require('../repositories/order.repository');
const variantRepo = require('../repositories/variant.repository');
const productRepo = require('../repositories/product.repository');
const dropService = require('./drop.service');
const cartRepo = require('../repositories/cart.repository');
const { events } = require('../events');
const { AppError, ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

const TRANSITIONS = {
  pending_payment: ['paid', 'cancelled', 'pending', 'confirmed', 'processing', 'shipped', 'completed'],
  pending: ['paid', 'cancelled', 'confirmed', 'processing', 'shipped', 'completed'],
  paid: ['processing', 'cancelled', 'shipped', 'completed'],
  processing: ['shipped', 'cancelled', 'completed'],
  shipped: ['completed', 'cancelled'],
  completed: ['cancelled'],
  cancelled: [],
};

function canTransition(from, to) {
  return TRANSITIONS[from] && TRANSITIONS[from].includes(to);
}

async function createFromCart(userId, customerData, sessionId = null) {
  const cart = await cartRepo.findOrCreate(userId, sessionId);
  const cartItems = await cartRepo.getCartWithItems(cart.id);

  if (cartItems.length === 0) {
    throw new ValidationError('Cart is empty');
  }

  const activeDrop = await dropService.getActiveDrop();
  if (!activeDrop) {
    throw new ValidationError('Store is not currently active');
  }

  const enrichedItems = [];
  const invalidItems = [];
  const seenDropIds = new Set();

  for (const item of cartItems) {
    const v = item.product_variants;
    const p = item.products;

    if (!v || !p) {
      invalidItems.push({ cartItemId: item.id, error: 'Variant or product no longer exists' });
      continue;
    }

    if (v.stock < item.quantity) {
      invalidItems.push({
        cartItemId: item.id,
        variantId: v.id,
        error: `Insufficient stock for ${v.color}/${v.size}. Available: ${v.stock}, in cart: ${item.quantity}`,
      });
      continue;
    }

    seenDropIds.add(p.drop_id);

    const unitPrice = v.price_override || p.base_price;
    enrichedItems.push({
      variantId: v.id,
      productId: p.id,
      productName: p.name,
      size: v.size,
      color: v.color,
      unitPrice: Number(unitPrice),
      quantity: item.quantity,
      subtotal: Number((unitPrice * item.quantity).toFixed(2)),
    });
  }

  if (invalidItems.length > 0) {
    throw new ValidationError(JSON.stringify({ message: 'Cart contains invalid items', issues: invalidItems }));
  }

  for (const dropId of seenDropIds) {
    const dropValid = await dropService.validateDropWindow(dropId);
    if (!dropValid) {
      throw new ValidationError('One or more products are no longer available. Please update your cart.');
    }
  }

  const totalAmount = enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);

  const productImages = enrichedItems.length > 0 ? (enrichedItems[0].productImages || null) : null;

  const order = await orderRepo.create({
    user_id: userId,
    status: 'pending_payment',
    customer_name: customerData.customer_name || null,
    customer_email: customerData.customer_email || null,
    phone_number: customerData.customer_phone || null,
    total_price: Number(totalAmount.toFixed(2)),
    payment_method: customerData.payment_method || 'reservation',
    color: enrichedItems.length > 0 ? enrichedItems[0].color : null,
    product_image_urls: productImages,
  });

  const reservedVariants = [];
  try {
    for (const item of enrichedItems) {
      await variantRepo.reserveStock(item.variantId, item.quantity, order.id);
      reservedVariants.push({ variantId: item.variantId, quantity: item.quantity });
      events.emit(events.INVENTORY_RESERVED, { variantId: item.variantId, orderId: order.id, quantity: item.quantity });

      await orderRepo.createOrderItem(order.id, {
        product_id: item.productId,
        product_name: item.productName,
        size: item.size,
        color: item.color,
        price_at_purchase: Number(item.unitPrice),
        total_price: Number(item.subtotal),
        quantity: item.quantity,
      });
    }
  } catch (err) {
    for (const rv of reservedVariants) {
      try {
         await variantRepo.returnStock(rv.variantId, rv.quantity, order.id);
      } catch (returnErr) {
        console.error('Failed to return stock during rollback:', returnErr);
      }
    }
    throw new ValidationError('Failed to create order due to inventory conflict. Please try again.');
  }

  await cartRepo.clearCart(cart.id);

  const fullOrder = await orderRepo.findById(order.id);
  events.emit(events.ORDER_CREATED, { order: fullOrder });

  return fullOrder;
}

async function createDirect(userId, customerData, items, sessionId = null) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('At least one item is required to place an order', 400);
  }

  const activeDrop = await dropService.getActiveDrop();
  if (!activeDrop) {
    throw new AppError('Store is not currently active. Please try again later or contact support.', 400);
  }

  const enrichedItems = [];
  for (const item of items) {
    const variantId = item?.variantId;
    if (!variantId) {
      throw new AppError('Each order item must include a variant ID. Please select a valid size and color.', 400);
    }

    const variant = await variantRepo.findById(variantId);

    if (!variant) {
      throw new AppError(`Selected variant (${variantId}) no longer exists. Please refresh and try again.`, 404);
    }

    const product = await productRepo.findById(variant.product_id);
    if (!product) {
      throw new AppError(`Product not found for the selected variant. Please refresh and try again.`, 404);
    }

    if (product.drop_id !== activeDrop.id) {
      throw new AppError(`"${product.name}" is not available in the current drop. Please refresh the page and try again.`, 400);
    }

    const qty = Number(item.quantity) || 1;
    if (qty < 1 || qty > 99) {
      throw new AppError(`Invalid quantity (${qty}). Please enter a number between 1 and 99.`, 400);
    }

    if (variant.stock < qty) {
      throw new AppError(`Not enough stock for ${variant.color}/${variant.size}. Available: ${variant.stock}, requested: ${qty}.`, 400);
    }

    const unitPrice = variant.price_override || product.base_price;
    const productImages = Array.isArray(product.images) ? product.images : (Array.isArray(product.image_urls) ? product.image_urls : null);
    enrichedItems.push({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      size: variant.size,
      color: variant.color,
      unitPrice: Number(unitPrice),
      quantity: qty,
      subtotal: Number((unitPrice * qty).toFixed(2)),
      productImages: productImages,
    });
  }

  const totalAmount = enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);

  const productImages = enrichedItems.length > 0 ? (enrichedItems[0].productImages || null) : null;

  const order = await orderRepo.create({
    user_id: userId,
    status: 'pending_payment',
    customer_name: customerData.customer_name || null,
    customer_email: customerData.customer_email || null,
    phone_number: customerData.customer_phone || null,
    total_price: Number(totalAmount.toFixed(2)),
    payment_method: customerData.payment_method || 'reservation',
    color: enrichedItems.length > 0 ? enrichedItems[0].color : null,
    product_image_urls: productImages,
  });

  for (const item of enrichedItems) {
    await variantRepo.reserveStock(item.variantId, item.quantity, order.id);
    await orderRepo.createOrderItem(order.id, {
      product_id: item.productId,
      product_name: item.productName,
      size: item.size,
      color: item.color,
      price_at_purchase: Number(item.unitPrice),
      total_price: Number(item.subtotal),
      quantity: item.quantity,
      product_image_urls: item.productImages || null,
    });
  }

  const fullOrder = await orderRepo.findById(order.id);
  events.emit(events.ORDER_CREATED, { order: fullOrder });

  return fullOrder;
}

async function transitionStatus(orderId, newStatus) {
  console.log('[TRANSITION STATUS] Input:', { orderId, newStatus });

  const order = await orderRepo.findById(orderId);
  if (!order) {
    console.error('[TRANSITION STATUS] Order not found:', orderId);
    throw new NotFoundError('Order not found');
  }

  console.log('[TRANSITION STATUS] Current order status:', order.status);

  if (order.status === 'completed' || order.status === 'cancelled') {
    console.error('[TRANSITION STATUS] Terminal state transition attempted:', order.status, '→', newStatus);
    throw new ValidationError(`Cannot transition from terminal state: ${order.status}`);
  }

  const canDo = canTransition(order.status, newStatus);
  console.log('[TRANSITION STATUS] Can transition:', canDo, 'from', order.status, 'to', newStatus);

  if (!canDo) {
    console.error('[TRANSITION STATUS] Invalid transition blocked:', order.status, '→', newStatus);
    throw new ValidationError(`Invalid transition: ${order.status} → ${newStatus}`);
  }

  if (newStatus === 'cancelled' && ['pending_payment', 'paid'].includes(order.status)) {
    console.log('[TRANSITION STATUS] Cancelling order, returning stock for', (order.order_items || []).length, 'items');
    for (const item of order.order_items || []) {
      try {
        await variantRepo.returnStock(item.product_variant_id, item.quantity, orderId);
        events.emit(events.INVENTORY_RELEASED, { variantId: item.product_variant_id, orderId, quantity: item.quantity });
      } catch (err) {
        console.error('[TRANSITION STATUS] Failed to return stock on cancel:', err);
      }
    }
  }

  console.log('[TRANSITION STATUS] Updating order status in DB:', orderId, '→', newStatus);
  await orderRepo.updateStatus(orderId, newStatus);

  if (newStatus === 'cancelled') {
    events.emit(events.ORDER_CANCELLED, { orderId, status: newStatus });
  }

  const updated = await orderRepo.findById(orderId);
  console.log('[TRANSITION STATUS] Final order status:', updated.status);
  return updated;
}

async function getOrderById(id, userId = null) {
  const order = await orderRepo.findById(id);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (userId && order.user_id !== userId) {
    throw new ForbiddenError('Access denied');
  }

  return order;
}

async function getMyOrders(userId, limit = 50, offset = 0) {
  return orderRepo.findByUserId(userId, limit, offset);
}

async function getAllOrders(filters) {
  return orderRepo.findAllAdmin(filters);
}

async function cancelOrder(orderId) {
  const order = await orderRepo.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.status === 'cancelled') {
    return order;
  }

  if (order.status === 'completed') {
    throw new ValidationError('Cannot cancel a completed order');
  }

  if (['pending_payment', 'paid'].includes(order.status)) {
    for (const item of order.order_items || []) {
      try {
        await variantRepo.returnStock(item.product_variant_id, item.quantity, orderId);
        events.emit(events.INVENTORY_RELEASED, { variantId: item.product_variant_id, orderId, quantity: item.quantity });
      } catch (err) {
        console.error('Failed to return stock on cancel:', err);
      }
    }
  }

  await orderRepo.updateStatus(orderId, 'cancelled');
  events.emit(events.ORDER_CANCELLED, { orderId, status: 'cancelled' });

  return orderRepo.findById(orderId);
}

module.exports = {
  TRANSITIONS,
  canTransition,
  createFromCart,
  createDirect,
  transitionStatus,
  getOrderById,
  getMyOrders,
  getAllOrders,
  cancelOrder,
};
