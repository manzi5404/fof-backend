const variantRepo = require('../repositories/variant.repository');
const { events } = require('../events');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');

async function createVariants(productId, variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return [];
  }

  const processed = [];
  const seen = new Set();

  for (const v of variants) {
    if (!v.color || !v.size) {
      throw new ValidationError('Each variant must have color and size');
    }

    const key = `${productId}-${v.color}-${v.size}`.toLowerCase();
    if (seen.has(key)) {
      throw new ConflictError(`Duplicate variant: ${v.color} / ${v.size}`);
    }
    seen.add(key);

    let sku = v.sku || null;
    if (!sku) {
      sku = `PROD-${productId}-${v.color.replace(/[^a-zA-Z0-9]/g, '')}-${v.size.replace(/[^a-zA-Z0-9]/g, '')}`;
    }

    const stock = v.stock !== undefined ? Math.max(0, Number(v.stock)) : 0;
    const priceOverride = v.price_override ? Number(v.price_override) : null;

    processed.push({
      product_id: productId,
      color: v.color.trim(),
      size: v.size.trim(),
      sku,
      stock,
      price_override: priceOverride,
    });
  }

  const created = await variantRepo.createBatch(processed);
  return created;
}

async function validateVariantExists(variantId) {
  const variant = await variantRepo.findById(variantId);
  if (!variant) {
    throw new NotFoundError('Product variant not found');
  }
  return variant;
}

async function getVariantWithStock(variantId) {
  const variant = await variantRepo.findById(variantId);
  if (!variant) {
    throw new NotFoundError('Product variant not found');
  }
  return variant;
}

async function validateAndReserve(variantId, quantity) {
  const variant = await variantRepo.findById(variantId);
  if (!variant) {
    throw new NotFoundError('Product variant not found');
  }

  if (variant.stock < quantity) {
    throw new ValidationError(`Insufficient stock for ${variant.color} / ${variant.size}. Available: ${variant.stock}`);
  }

  const reserved = await variantRepo.reserveStock(variantId, quantity);
  events.emit(events.INVENTORY_RESERVED, { variantId, quantity });
  return reserved;
}

async function recordInventoryAdjustment(variantId, orderId, changeAmount, previousStock, newStock, reason) {
  events.emit(events.INVENTORY_ADJUSTED, {
    variantId,
    orderId,
    changeAmount,
    previousStock,
    newStock,
    reason,
  });
}

module.exports = {
  createVariants,
  validateVariantExists,
  getVariantWithStock,
  validateAndReserve,
};
