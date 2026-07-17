const collectionRepo = require('../repositories/collection.repository');
const dropRepo = require('../repositories/drop.repository');
const { events } = require('../events');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');

function generateSlug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getCollections(isAdmin = false, includeDrops = false) {
  const collections = await collectionRepo.findAll({ includeDrafts: isAdmin });

  const withExtras = await Promise.all(
    collections.map(async (c) => {
      const base = { ...c, drop_count: await collectionRepo.countDrops(c.id) };
      if (includeDrops) {
        base.drops = await collectionRepo.getDrops(c.id);
      }
      return base;
    })
  );

  return withExtras;
}

async function getCollectionBySlug(slug) {
  const collection = await collectionRepo.findBySlug(slug);
  if (!collection) throw new NotFoundError('Collection not found');
  const drops = await collectionRepo.getDrops(collection.id);
  return { ...collection, drops };
}

async function createCollection(data) {
  if (!data.title || !data.title.trim()) {
    throw new ValidationError('Title is required');
  }

  const baseSlug = generateSlug(data.slug || data.title);
  let slug = baseSlug;
  let existing = await collectionRepo.findBySlug(slug);
  let counter = 1;
  while (existing) {
    slug = `${baseSlug}-${counter}`;
    existing = await collectionRepo.findBySlug(slug);
    counter++;
  }

  const collection = await collectionRepo.create({
    title: data.title.trim(),
    slug,
    description: data.description || null,
    image_url: data.image_url || null,
    status: data.status || 'draft',
    sort_order: data.sort_order != null ? data.sort_order : 0,
    featured: data.featured != null ? data.featured : false,
  });

  events.emit(events.COLLECTION_CREATED, { collection });
  return collection;
}

async function updateCollection(id, data) {
  const existing = await collectionRepo.findById(id);
  if (!existing) throw new NotFoundError('Collection not found');

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description;
  if (data.image_url !== undefined) updateData.image_url = data.image_url;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
  if (data.featured !== undefined) updateData.featured = data.featured;

  if (data.slug !== undefined && data.slug !== existing.slug) {
    const slug = generateSlug(data.slug);
    const conflict = await collectionRepo.findBySlug(slug);
    if (conflict && conflict.id !== id) throw new ConflictError('Slug already in use');
    updateData.slug = slug;
  }

  const collection = await collectionRepo.update(id, updateData);
  events.emit(events.COLLECTION_UPDATED, { collection });
  return collection;
}

async function deleteCollection(id) {
  const existing = await collectionRepo.findById(id);
  if (!existing) throw new NotFoundError('Collection not found');
  await collectionRepo.remove(id);
  events.emit(events.COLLECTION_DELETED, { id });
  return true;
}

async function addDrop(collectionId, dropId, sortOrder = 0) {
  if (!dropId) throw new ValidationError('dropId is required');

  const collection = await collectionRepo.findById(collectionId);
  if (!collection) throw new NotFoundError('Collection not found');

  const drop = await dropRepo.findById(dropId);
  if (!drop) throw new NotFoundError('Drop not found');

  return collectionRepo.addDrop(collectionId, dropId, sortOrder || 0);
}

async function removeDrop(collectionId, dropId) {
  const collection = await collectionRepo.findById(collectionId);
  if (!collection) throw new NotFoundError('Collection not found');
  return collectionRepo.removeDrop(collectionId, dropId);
}

module.exports = {
  getCollections,
  getCollectionBySlug,
  createCollection,
  updateCollection,
  deleteCollection,
  addDrop,
  removeDrop,
};
