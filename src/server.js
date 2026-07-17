require('dotenv').config();

const { validateEnv } = require('./utils/env');
validateEnv();

const { app } = require('./app');
const listEndpoints = require('express-list-endpoints');

console.log('\n=== REGISTERED ROUTES ===');
console.table(
  listEndpoints(app).map(route => ({
    methods: route.methods.join(', '),
    path: route.path
  }))
);
const { on, ORDER_CREATED, PAYMENT_VERIFIED, ORDER_CANCELLED, DROP_CREATED, DROP_ACTIVATED, PRODUCT_CREATED, USER_REGISTERED, WAITLIST_JOINED, INVENTORY_RESERVED, INVENTORY_RELEASED } = require('./events');
const notificationService = require('./services/notification.service');
const waitlistService = require('./services/waitlist.service');
const auditService = require('./services/audit.service');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

on(ORDER_CREATED, async ({ order }) => {
  try {
    await notificationService.createForAdmins('order', `New order #${order.id} — ${order.total_amount}`);
    await auditService.logAction({ userId: order.user_id, action: 'order_created', entityType: 'order', entityId: order.id });
  } catch (err) {
    console.error('Failed to process ORDER_CREATED event:', err);
  }
});

on(PAYMENT_VERIFIED, async ({ order, verification }) => {
  try {
    await notificationService.createForUser(order.user_id, 'payment', `Payment confirmed for order #${order.id}`);
    await auditService.logPaymentVerification(order.user_id, 'payment_verified', order.id, { status: 'pending_payment' }, { status: 'paid', payment_reference: order.payment_reference });
  } catch (err) {
    console.error('Failed to process PAYMENT_VERIFIED event:', err);
  }
});

on(ORDER_CANCELLED, async ({ orderId }) => {
  try {
    await auditService.logOrderChange(null, 'order_cancelled', orderId);
  } catch (err) {
    console.error('Failed to process ORDER_CANCELLED event:', err);
  }
});

on(DROP_CREATED, async ({ drop }) => {
  try {
    await auditService.logDropChange(null, 'drop_created', drop.id, null, { title: drop.title, status: drop.status });
  } catch (err) {
    console.error('Failed to process DROP_CREATED event:', err);
  }
});

on(DROP_ACTIVATED, async ({ drop }) => {
  try {
    await waitlistService.notifyForDrop(drop.id, drop.title);
    await auditService.logDropChange(null, 'drop_activated', drop.id, null, { status: 'live' });
  } catch (err) {
    console.error('Failed to process DROP_ACTIVATED event:', err);
  }
});

on(PRODUCT_CREATED, async ({ product }) => {
  try {
    await auditService.logProductChange(null, 'product_created', product.id, null, { name: product.name, base_price: product.base_price });
  } catch (err) {
    console.error('Failed to process PRODUCT_CREATED event:', err);
  }
});

on(USER_REGISTERED, async ({ user }) => {
  try {
    await auditService.logAuth(user.id, 'user_registered');
  } catch (err) {
    console.error('Failed to process USER_REGISTERED event:', err);
  }
});

on(WAITLIST_JOINED, async ({ entry }) => {
  try {
    await auditService.logAction({ userId: null, action: 'waitlist_joined', entityType: 'waitlist', entityId: entry.id });
  } catch (err) {
    console.error('Failed to process WAITLIST_JOINED event:', err);
  }
});

on(INVENTORY_RESERVED, async ({ variantId, orderId, quantity }) => {
  try {
    await auditService.logInventoryChange({ userId: null, variantId, orderId, changeAmount: -quantity, reason: 'reserve' });
  } catch (err) {
    console.error('Failed to process INVENTORY_RESERVED event:', err);
  }
});

on(INVENTORY_RELEASED, async ({ variantId, orderId, quantity }) => {
  try {
    await auditService.logInventoryChange({ userId: null, variantId, orderId, changeAmount: quantity, reason: 'cancellation' });
  } catch (err) {
    console.error('Failed to process INVENTORY_RELEASED event:', err);
  }
});

module.exports = { server };
