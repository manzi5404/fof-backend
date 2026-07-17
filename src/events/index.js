const { EventEmitter } = require('events');

const emitter = new EventEmitter();

const ORDER_CREATED = 'order.created';
const PAYMENT_VERIFIED = 'payment.verified';
const PAYMENT_REJECTED = 'payment.rejected';
const ORDER_CANCELLED = 'order.cancelled';
const DROP_CREATED = 'drop.created';
const DROP_ACTIVATED = 'drop.activated';
const DROP_CLOSED = 'drop.closed';
const DROP_SOLD_OUT = 'drop.sold_out';
const DROP_DELETED = 'drop.deleted';
const PRODUCT_CREATED = 'product.created';
const PRODUCT_UPDATED = 'product.updated';
const PRODUCT_DELETED = 'product.deleted';
const USER_REGISTERED = 'user.registered';
const PASSWORD_RESET_REQUESTED = 'password_reset.requested';
const WAITLIST_JOINED = 'waitlist.joined';
const WAITLIST_NOTIFIED = 'waitlist.notified';
const NOTIFICATION_CREATED = 'notification.created';
const INVENTORY_RESERVED = 'inventory.reserved';
const INVENTORY_RELEASED = 'inventory.released';
const INVENTORY_ADJUSTED = 'inventory.adjusted';
const COLLECTION_CREATED = 'collection.created';
const COLLECTION_UPDATED = 'collection.updated';
const COLLECTION_DELETED = 'collection.deleted';

function on(event, listener) {
  emitter.on(event, listener);
}

function off(event, listener) {
  emitter.off(event, listener);
}

function emit(event, ...args) {
  emitter.emit(event, ...args);
}

function removeAllListeners(event) {
  if (event) {
    emitter.removeAllListeners(event);
  } else {
    emitter.removeAllListeners();
  }
}

module.exports = {
  events: emitter,
  emitter,
  on,
  off,
  emit,
  removeAllListeners,
  ORDER_CREATED,
  PAYMENT_VERIFIED,
  PAYMENT_REJECTED,
  ORDER_CANCELLED,
  DROP_CREATED,
  DROP_ACTIVATED,
  DROP_CLOSED,
  DROP_SOLD_OUT,
  DROP_DELETED,
  PRODUCT_CREATED,
  PRODUCT_UPDATED,
  PRODUCT_DELETED,
  USER_REGISTERED,
  PASSWORD_RESET_REQUESTED,
  WAITLIST_JOINED,
  WAITLIST_NOTIFIED,
  NOTIFICATION_CREATED,
  INVENTORY_RESERVED,
  INVENTORY_RELEASED,
  INVENTORY_ADJUSTED,
  COLLECTION_CREATED,
  COLLECTION_UPDATED,
  COLLECTION_DELETED,
};
