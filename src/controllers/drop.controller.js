const dropService = require('../services/drop.service');
const { handleServiceError } = require('../utils/responseHandler');

async function getActiveDrop(req, res) {
  try {
    const includeProducts = req.query.includeProducts === 'true';
    const drop = await dropService.getActiveDrop(includeProducts);
    return res.status(200).json({ success: true, drop: drop || null });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getAllDrops(req, res) {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const includeProducts = req.query.includeProducts === 'true';
    const type = req.query.type || null;
    const drops = await dropService.getAllDrops(isAdmin, includeProducts, type);
    return res.status(200).json({ success: true, drops });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getDropBySlug(req, res) {
  try {
    const drop = await dropService.getDropBySlug(req.params.slug);
    return res.status(200).json({ success: true, drop });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function createDrop(req, res) {
  try {
    const drop = await dropService.createDrop(req.body);
    return res.status(201).json({ success: true, drop });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function updateDrop(req, res) {
  try {
    const drop = await dropService.updateDrop(req.params.id, req.body);
    return res.status(200).json({ success: true, drop });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function activateDrop(req, res) {
  try {
    const drop = await dropService.activateDrop(req.params.id);
    return res.status(200).json({ success: true, drop });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function deleteDrop(req, res) {
  try {
    await dropService.deleteDrop(req.params.id);
    return res.status(200).json({ success: true, message: 'Drop deleted' });
  } catch (err) {
    console.error('[DROP DELETE CONTROLLER] Error:', err);
    const errorMessage = err.message || 'Failed to delete drop';
    return res.status(500).json({ success: false, error: errorMessage });
  }
}

module.exports = {
  getActiveDrop,
  getAllDrops,
  getDropBySlug,
  createDrop,
  updateDrop,
  activateDrop,
  deleteDrop,
};
