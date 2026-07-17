const productRepo = require('../repositories/product.repository');
const variantRepo = require('../repositories/variant.repository');
const dropService = require('./drop.service');
const { events } = require('../events');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getProductsByDrop(dropId) {
  const products = await productRepo.findByDropId(dropId);
  return products;
}

async function getProductBySlug(slug) {
  const product = await productRepo.findBySlug(slug);
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  return product;
}

async function getProductById(id) {
  const product = await productRepo.findById(id);
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  return product;
}

async function createProduct(data) {
  if (!data.name || !data.name.trim()) {
    throw new ValidationError('Product name is required');
  }

  if (!data.drop_id) {
    throw new ValidationError('drop_id is required');
  }

  const allDrops = await dropService.getAllDrops(true);
  const dropExists = allDrops.some((d) => d.id === data.drop_id);
  if (!dropExists) {
    throw new ValidationError('Invalid drop_id: drop does not exist');
  }

  if (!data.base_price || Number(data.base_price) <= 0) {
    throw new ValidationError('base_price must be greater than 0');
  }

  const drop = await dropService.getActiveDrop();
  if (!drop || drop.id !== data.drop_id) {
    const dropExists = await dropService.getDropBySlug(
      (await dropService.getAllDrops(true)).find((d) => d.id === data.drop_id)?.slug || ''
    );
    if (!dropExists) {
      throw new ValidationError('Invalid drop_id: drop must exist');
    }
  }

  let slug = data.slug || generateSlug(data.name);
  let counter = 1;
  let isConflict = await productRepo.findBySlugConflict(slug);
  while (isConflict) {
    slug = `${generateSlug(data.name)}-${counter}`;
    counter++;
    isConflict = await productRepo.findBySlugConflict(slug);
  }

  const product = await productRepo.create({
    drop_id: data.drop_id,
    name: data.name.trim(),
    slug,
    description: data.description || null,
    base_price: Number(data.base_price),
    images: data.images || [],
    status: data.status || 'live',
  });

  events.emit(events.PRODUCT_CREATED, { product });

  if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
    const variantsService = require('./variant.service');
    await variantsService.createVariants(product.id, data.variants);
  }

  return product;
}

async function updateProduct(id, data) {
  const existing = await productRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Product not found');
  }

  if (data.slug && data.slug !== existing.slug) {
    const isConflict = await productRepo.findBySlugConflict(data.slug, id);
    if (isConflict) {
      throw new ConflictError('Slug already in use');
    }
  }

  if (data.name && !data.slug) {
    const newSlug = generateSlug(data.name);
    const isConflict = await productRepo.findBySlugConflict(newSlug, id);
    if (!isConflict) {
      data.slug = newSlug;
    }
  }

  const allowedFields = [
    'name', 'slug', 'description', 'base_price', 'images', 'status', 'drop_id',
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return existing;
  }

  if (data.variants && Array.isArray(data.variants)) {
    await productRepo.deleteVariants(id);
    const variantsService = require('./variant.service');
    await variantsService.createVariants(id, data.variants);
  }

  const updated = await productRepo.update(id, updateData);
  events.emit(events.PRODUCT_UPDATED, { product: updated, changes: updateData });
  return updated;
}

async function softDelete(id) {
  const product = await productRepo.findById(id);
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  await productRepo.softDelete(id);
  events.emit(events.PRODUCT_DELETED, { product });
  return true;
}

module.exports = {
  generateSlug,
  getProductsByDrop,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  softDelete,
};
