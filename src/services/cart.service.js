const cartRepo = require('../repositories/cart.repository');
const variantRepo = require('../repositories/variant.repository');
const productRepo = require('../repositories/product.repository');
const dropService = require('./drop.service');
const { NotFoundError, ValidationError } = require('../utils/errors');

async function getCart(userId, sessionId) {
  const cart = await cartRepo.findOrCreate(userId, sessionId);
  const items = await cartRepo.getCartWithItems(cart.id);

  const productIds = [...new Set(items.filter(i => i.product_variants).map(i => i.product_variants.product_id))];
  const productPromises = productIds.map(id => productRepo.findById(id));
  const products = await Promise.all(productPromises);
  const productMap = {};
  products.forEach((p, idx) => {
    if (p) productMap[productIds[idx]] = p;
  });

  const enrichedItems = items.map((item) => {
    const v = item.product_variants;
    const p = v ? productMap[v.product_id] : null;
    if (!v || !p) return null;
    const unitPrice = v.price_override || p.base_price;
    return {
      cartItemId: item.id,
      variantId: v.id,
      productId: p.id,
      productName: p.name,
      productSlug: p.slug,
      color: v.color,
      size: v.size,
      sku: v.sku,
      stock: v.stock,
      unitPrice: Number(unitPrice),
      quantity: item.quantity,
      subtotal: Number((unitPrice * item.quantity).toFixed(2)),
      images: p.images || [],
    };
  }).filter(Boolean);

  const total = enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    cartId: cart.id,
    items: enrichedItems,
    total: Number(total.toFixed(2)),
    itemCount: enrichedItems.length,
  };
}

async function addToCart(userId, sessionId, variantId, quantity) {
  if (!variantId) {
    throw new ValidationError('variantId is required');
  }

  const qty = Number(quantity) || 1;
  if (qty < 1 || qty > 99) {
    throw new ValidationError('Quantity must be between 1 and 99');
  }

  const variant = await variantRepo.findById(variantId);
  if (!variant) {
    throw new NotFoundError('Product variant not found');
  }

  if (variant.stock < qty) {
    throw new ValidationError(`Insufficient stock. Available: ${variant.stock}`);
  }

  const product = await productRepo.findById(variant.product_id);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const activeDrop = await dropService.getActiveDrop();
  if (!activeDrop || activeDrop.id !== product.drop_id) {
    throw new ValidationError('Store is not currently active');
  }

  const cart = await cartRepo.findOrCreate(userId, sessionId);
  const existingItem = items => items.find((i) => i.product_variant_id === variantId);
  const currentItems = await cartRepo.getCartWithItems(cart.id);
  const current = existingItem(currentItems);

  let newQuantity = qty;
  if (current) {
    newQuantity = current.quantity + qty;
    if (newQuantity > variant.stock) {
      throw new ValidationError(`Cannot add more. Cart has ${current.quantity}, stock available: ${variant.stock}`);
    }
  }

  await cartRepo.addItem(cart.id, variantId, newQuantity);

  return getCart(userId, sessionId);
}

async function updateCartItem(userId, sessionId, variantId, quantity) {
  const qty = Number(quantity) || 1;

  const cart = await cartRepo.findOrCreate(userId, sessionId);
  const variant = await variantRepo.findById(variantId);

  if (!variant) {
    throw new NotFoundError('Product variant not found');
  }

  if (qty > variant.stock) {
    throw new ValidationError(`Insufficient stock. Available: ${variant.stock}`);
  }

  await cartRepo.updateItemQuantity(cart.id, variantId, qty);

  return getCart(userId, sessionId);
}

async function removeCartItem(userId, sessionId, variantId) {
  const cart = await cartRepo.findOrCreate(userId, sessionId);
  await cartRepo.removeItem(cart.id, variantId);

  return getCart(userId, sessionId);
}

async function clearCart(userId, sessionId) {
  const cart = await cartRepo.findOrCreate(userId, sessionId);
  await cartRepo.clearCart(cart.id);

  return { success: true, cartId: cart.id };
}

async function validateCartItems(userId, sessionId) {
  const cart = await cartRepo.findOrCreate(userId, sessionId);
  const items = await cartRepo.getCartWithItems(cart.id);

  const issues = [];

  for (const item of items) {
    const v = item.product_variants;
    const p = item.products;

    if (!v) {
      issues.push({ cartItemId: item.id, error: 'Variant no longer exists' });
      continue;
    }

    if (!p) {
      issues.push({ cartItemId: item.id, error: 'Product no longer exists' });
      continue;
    }

    if (v.stock < item.quantity) {
      issues.push({
        cartItemId: item.id,
        variantId: v.id,
        error: `Insufficient stock for ${v.color}/${v.size}. Available: ${v.stock}, in cart: ${item.quantity}`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    itemCount: items.length,
  };
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  validateCartItems,
};
