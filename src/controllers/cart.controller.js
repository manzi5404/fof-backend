const { requireAuth } = require('../middleware/auth');
const cartService = require('../services/cart.service');
const { handleServiceError } = require('../utils/responseHandler');

async function getCart(req, res) {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || null;
    const cart = await cartService.getCart(req.user.id, sessionId);
    return res.status(200).json({ success: true, ...cart });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function addItem(req, res) {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || null;
    const { variantId, quantity } = req.body;
    const cart = await cartService.addToCart(req.user.id, sessionId, variantId, quantity);
    return res.status(200).json({ success: true, ...cart });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function updateItem(req, res) {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || null;
    const { quantity } = req.body;
    const cart = await cartService.updateCartItem(req.user.id, sessionId, req.params.variantId, quantity);
    return res.status(200).json({ success: true, ...cart });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function removeItem(req, res) {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || null;
    const cart = await cartService.removeCartItem(req.user.id, sessionId, req.params.variantId);
    return res.status(200).json({ success: true, ...cart });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function clearCartItems(req, res) {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || null;
    const result = await cartService.clearCart(req.user.id, sessionId);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCartItems,
};
