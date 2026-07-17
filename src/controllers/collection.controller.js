const collectionService = require('../services/collection.service');
const { handleServiceError } = require('../utils/responseHandler');
const { ValidationError } = require('../utils/errors');

async function getCollections(req, res) {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const includeDrops = req.query.includeDrops === 'true';
    const collections = await collectionService.getCollections(isAdmin, includeDrops);
    return res.status(200).json({ success: true, collections });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getCollectionBySlug(req, res) {
  try {
    const collection = await collectionService.getCollectionBySlug(req.params.slug);
    return res.status(200).json({ success: true, collection });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function createCollection(req, res) {
  try {
    const collection = await collectionService.createCollection(req.body);
    return res.status(201).json({ success: true, collection });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function updateCollection(req, res) {
  try {
    const collection = await collectionService.updateCollection(req.params.id, req.body);
    return res.status(200).json({ success: true, collection });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function deleteCollection(req, res) {
  try {
    await collectionService.deleteCollection(req.params.id);
    return res.status(200).json({ success: true, message: 'Collection deleted' });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function addDrop(req, res) {
  try {
    const { dropId, sortOrder } = req.body;
    if (!dropId) throw new ValidationError('dropId is required');
    const link = await collectionService.addDrop(req.params.id, dropId, sortOrder);
    return res.status(201).json({ success: true, link });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function removeDrop(req, res) {
  try {
    await collectionService.removeDrop(req.params.id, req.params.dropId);
    return res.status(200).json({ success: true, message: 'Drop removed from collection' });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
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
