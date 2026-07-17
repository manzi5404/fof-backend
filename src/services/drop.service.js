const dropRepo = require('../repositories/drop.repository');
const productRepo = require('../repositories/product.repository');
const variantRepo = require('../repositories/variant.repository');
const qualityPriceRepo = require('../repositories/quality-price.repository');
const { supabaseAdmin } = require('../config/supabaseAdmin');
const { events } = require('../events');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const VALID_STATUSES = ['upcoming', 'reservation', 'live', 'closed'];

function normalizeStatus(status) {
  if (!status) return 'upcoming';
  const normalized = String(status).trim().toLowerCase();
  if (VALID_STATUSES.includes(normalized)) return normalized;
  if (normalized === 'draft') return 'upcoming';
  if (normalized === 'closed') return 'upcoming';
  return 'upcoming';
}

async function createQualityPrices(productId, qualityPrices) {
  if (!qualityPrices || typeof qualityPrices !== 'object') return;
  await qualityPriceRepo.upsert(productId, qualityPrices);
}

async function syncProductVariants(productId, colors, sizes, quantity = 10) {
  const colorList = Array.isArray(colors) ? colors.filter(Boolean) : [];
  const sizeList = Array.isArray(sizes) ? sizes.filter(Boolean) : [];
  if (colorList.length === 0 || sizeList.length === 0) return;

  const variantsService = require('./variant.service');
  await productRepo.deleteVariants(productId);
  const variantPayload = [];
  for (const color of colorList) {
    for (const size of sizeList) {
      const safeColor = String(color).trim();
      const safeSize = String(size).trim();
      if (!safeColor || !safeSize) continue;
      const sku = `PROD-${productId}-${safeColor.replace(/[^a-zA-Z0-9]/g, '')}-${safeSize.replace(/[^a-zA-Z0-9]/g, '')}`;
      variantPayload.push({ color: safeColor, size: safeSize, sku, stock: Number.isFinite(quantity) ? Math.max(0, Number(quantity)) : 10 });
    }
  }
  if (variantPayload.length > 0) {
    await variantsService.createVariants(productId, variantPayload);
  }
}

async function ensureUniqueSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;
  let isConflict = await dropRepo.findSlugConflict(slug, excludeId);

  while (isConflict) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    isConflict = await dropRepo.findSlugConflict(slug, excludeId);
  }

  return slug;
}

async function getActiveDrop(includeProducts = false) {
    const drop = await dropRepo.findActive();
    if (!drop || !includeProducts) return drop;
    const products = await productRepo.findByDropId(drop.id);
    await attachQualityPrices(products);
    return { ...drop, products };
}

async function getAllDrops(includeAll = false, includeProducts = false, type = null) {
    const drops = await dropRepo.findAll(includeAll);
    const filtered = type ? drops.filter(d => d.type === type) : drops;
    if (includeProducts && filtered.length > 0) {
        const productsByDrop = await Promise.all(filtered.map(row => productRepo.findByDropId(row.id)));
        filtered.forEach((row, index) => {
            row.products = productsByDrop[index] || [];
        });
        await attachQualityPrices(filtered.flatMap(d => d.products || []));
    }
    return filtered;
}

async function attachQualityPrices(products) {
  if (!products || products.length === 0) return;
  try {
    const productIds = products.map(p => p.id).filter(Boolean);
    if (productIds.length === 0) return;
    const { data: prices, error } = await supabaseAdmin
      .from('product_quality_prices')
      .select('*')
      .in('product_id', productIds);
    if (error) return;

    const qualityIds = [...new Set((prices || []).map(p => p.quality_level_id).filter(Boolean))];
    const qualityMap = new Map();
    if (qualityIds.length > 0) {
      const { data: levels } = await supabaseAdmin
        .from('quality_levels')
        .select('id, name, description')
        .in('id', qualityIds);
      for (const level of levels || []) {
        qualityMap.set(level.id, level);
      }
    }

    const byProduct = new Map();
    for (const row of prices || []) {
      if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, []);
      const quality = qualityMap.get(row.quality_level_id) || {};
      byProduct.get(row.product_id).push({
        ...row,
        quality_level_id: row.quality_level_id,
        quality_name: quality.name || '',
        quality_description: quality.description || '',
        price: parseFloat(row.price) || 0
      });
    }
    for (const product of products) {
      product.product_quality_prices = byProduct.get(product.id) || [];
    }
  } catch (_) {
    // table may not exist yet; fail silently
  }
}

async function getDropBySlug(slug) {
  const drop = await dropRepo.findBySlug(slug);
  if (!drop) {
    throw new NotFoundError('Drop not found');
  }
  return drop;
}

async function createDrop(data) {
  if (!data.title || data.title.trim() === '') {
    throw new ValidationError('Title is required');
  }

  const slug = await ensureUniqueSlug(generateSlug(data.title));
  const payload = {
    title: data.title.trim(),
    slug,
    description: data.description || null,
    theme_scripture: data.theme_scripture || null,
    hero_video: data.hero_video || null,
    hero_image: data.hero_image || null,
    image_url: data.image_url || null,
    release_date: data.release_date || new Date().toISOString(),
    close_date: data.close_date || null,
    status: data.status ? normalizeStatus(data.status) : (data.type === 'new-drop' || data.type === 'recent-drop' ? 'live' : 'upcoming'),
    type: data.type || 'recent-drop',
  };

  const drop = await dropRepo.create(payload);

  if (data.type === 'new-drop') {
    await dropRepo.demotePreviousNewDrops(drop.id);
  }

  if (data.products && Array.isArray(data.products)) {
    for (const product of data.products) {
      const baseSlug = generateSlug(product.name || product.title || 'product');
      let slug = baseSlug;
      let counter = 1;
      let isConflict = await productRepo.findBySlugConflict(slug);
      while (isConflict) {
        slug = `${baseSlug}-${counter}`;
        counter++;
        isConflict = await productRepo.findBySlugConflict(slug);
      }

      const normalizedProduct = {
        ...product,
        drop_id: drop.id,
        slug,
        name: product.name || product.title || 'Untitled Product',
        status: data.status || payload.status,
        sizes: Array.isArray(product.sizes) ? product.sizes : [],
        colors: Array.isArray(product.colors) ? product.colors : [],
        image_urls: Array.isArray(product.image_urls) ? product.image_urls : (product.image_url ? [product.image_url] : []),
      };
      delete normalizedProduct.size;
      delete normalizedProduct.image_url;
      delete normalizedProduct.title;
      delete normalizedProduct.tempId;
      delete normalizedProduct.uploading;
      delete normalizedProduct.quality_prices;
      delete normalizedProduct.colorsInput;
      const createdProduct = await productRepo.create(normalizedProduct);

      await createQualityPrices(createdProduct.id, product.quality_prices);
      await syncProductVariants(createdProduct.id, normalizedProduct.colors, normalizedProduct.sizes, product.quantity);
    }
  }

  events.emit(events.DROP_CREATED, { drop });

  return drop;
}

async function updateDrop(id, data) {
  const existing = await dropRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Drop not found');
  }

  if (data.title && data.title.trim() !== '') {
    const newSlug = await ensureUniqueSlug(generateSlug(data.title), id);
    data.slug = newSlug;
  }

  if (data.slug && !data.title) {
    const isConflict = await dropRepo.findSlugConflict(data.slug, id);
    if (isConflict) {
      throw new ConflictError('Slug already in use');
    }
  }

  const allowedFields = [
    'title', 'slug', 'description', 'theme_scripture',
    'hero_video', 'hero_image', 'image_url',
    'release_date', 'close_date', 'status', 'type',
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = field === 'status' ? normalizeStatus(data[field]) : data[field];
    }
  }

  const wasLive = existing.status === 'live';
  const willBeLive = updateData.status === 'live';

  let updated;
  if (willBeLive && !wasLive) {
    updated = await dropRepo.activate(id);
    events.emit(events.DROP_ACTIVATED, { drop: updated });
  } else if (Object.keys(updateData).length > 0) {
    updated = await dropRepo.update(id, updateData);
  } else {
    updated = existing;
  }

  if (data.products && Array.isArray(data.products)) {
    const existingProducts = await productRepo.findByDropId(id);
    const existingMap = new Map(existingProducts.map(p => [p.id, p]));

    const incomingIds = new Set();

    for (const product of data.products) {
      if (product.id && existingMap.has(product.id)) {
        incomingIds.add(product.id);
        const baseSlug = generateSlug(product.name || product.title || 'product');
        let slug = baseSlug;
        let counter = 1;
        let isConflict = await productRepo.findBySlugConflict(slug, product.id);
        while (isConflict) {
          slug = `${baseSlug}-${counter}`;
          counter++;
          isConflict = await productRepo.findBySlugConflict(slug, product.id);
        }

        const normalizedProduct = {
          name: product.name || product.title || 'Untitled Product',
          description: product.description || null,
          price: parseFloat(product.price) || 0,
          slug,
          status: data.status || updateData.status || existing.status,
          sizes: Array.isArray(product.sizes) ? product.sizes : [],
          colors: Array.isArray(product.colors) ? product.colors : [],
          image_urls: Array.isArray(product.image_urls) ? product.image_urls : (product.image_url ? [product.image_url] : []),
          quantity: parseInt(product.quantity) || 1,
        };
        delete normalizedProduct.tempId;
        delete normalizedProduct.uploading;
        delete normalizedProduct.quality_prices;
        delete normalizedProduct.colorsInput;
        await productRepo.update(product.id, normalizedProduct);
        await createQualityPrices(product.id, product.quality_prices);
        await syncProductVariants(product.id, normalizedProduct.colors, normalizedProduct.sizes, product.quantity);
      } else {
        const baseSlug = generateSlug(product.name || product.title || 'product');
        let slug = baseSlug;
        let counter = 1;
        let isConflict = await productRepo.findBySlugConflict(slug);
        while (isConflict) {
          slug = `${baseSlug}-${counter}`;
          counter++;
          isConflict = await productRepo.findBySlugConflict(slug);
        }

        const normalizedProduct = {
          ...product,
          drop_id: id,
          slug,
          name: product.name || product.title || 'Untitled Product',
          status: data.status || updateData.status || existing.status,
          sizes: Array.isArray(product.sizes) ? product.sizes : [],
          colors: Array.isArray(product.colors) ? product.colors : [],
          image_urls: Array.isArray(product.image_urls) ? product.image_urls : (product.image_url ? [product.image_url] : []),
          quantity: parseInt(product.quantity) || 1,
        };
        delete normalizedProduct.size;
        delete normalizedProduct.image_url;
        delete normalizedProduct.title;
        delete normalizedProduct.tempId;
        delete normalizedProduct.uploading;
        delete normalizedProduct.quality_prices;
        delete normalizedProduct.colorsInput;
        const newProduct = await productRepo.create(normalizedProduct);
        await createQualityPrices(newProduct.id, product.quality_prices);
        await syncProductVariants(newProduct.id, normalizedProduct.colors, normalizedProduct.sizes, product.quantity);
      }
    }

    for (const [existingId, existingProduct] of existingMap) {
      if (!incomingIds.has(existingId)) {
        await productRepo.softDelete(existingId);
      }
    }
  }

  return updated;
}

async function activateDrop(id) {
  const existing = await dropRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Drop not found');
  }

  const activated = await dropRepo.activate(id);
  events.emit(events.DROP_ACTIVATED, { drop: activated });

  return activated;
}

async function deleteDrop(id) {
  const existing = await dropRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Drop not found');
  }

  try {
    await dropRepo.remove(id);
  } catch (removeError) {
    console.error(`[DROP DELETE] Primary delete failed for drop ${id}:`, removeError);
    
    const { error: productsError } = await supabaseAdmin
      .from('products')
      .update({ drop_id: null })
      .eq('drop_id', id);

    if (productsError) {
      console.error(`[DROP DELETE] Failed to nullify products for drop ${id}:`, productsError);
    }

    const { error: collectionError } = await supabaseAdmin
      .from('collection_drops')
      .delete()
      .eq('drop_id', id);

    if (collectionError) {
      console.error(`[DROP DELETE] Failed to remove collection_drops for drop ${id}:`, collectionError);
    }

    const { data, error } = await supabaseAdmin
      .from('drops')
      .delete()
      .eq('id', id)
      .select('id');

    if (error || !data || data.length === 0) {
      console.error(`[DROP DELETE] Fallback delete failed for drop ${id}:`, error);
      throw new Error(`Failed to delete drop: ${error?.message || removeError.message || 'Unknown error'}`);
    }
  }

  events.emit(events.DROP_DELETED, { id });

  return true;
}

async function validateDropWindow(dropId) {
  const drop = await dropRepo.findById(dropId);
  if (!drop) {
    return false;
  }

  if (drop.status !== 'live') {
    return false;
  }

  const now = new Date();
  const releaseDate = new Date(drop.release_date);
  const closeDate = drop.close_date ? new Date(drop.close_date) : null;

  if (now < releaseDate) {
    return false;
  }

  if (closeDate && now >= closeDate) {
    return false;
  }

  return true;
}

module.exports = {
  generateSlug,
  getActiveDrop,
  getAllDrops,
  getDropBySlug,
  createDrop,
  updateDrop,
  activateDrop,
  deleteDrop,
  validateDropWindow,
};
