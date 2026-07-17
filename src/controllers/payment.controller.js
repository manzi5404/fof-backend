const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const paymentService = require('../services/payment.service');
const { handleServiceError } = require('../utils/responseHandler');

async function verifyPayment(req, res) {
  try {
    const { orderId, paymentReference, paymentMethod, proofUrl, notes } = req.body;

    const result = await paymentService.verifyPayment(
      orderId,
      paymentReference,
      paymentMethod,
      req.user.id,
      proofUrl,
      notes
    );

    return res.status(200).json({
      success: true,
      order: {
        id: result.order.id,
        status: result.order.status,
        payment_reference: result.order.payment_reference,
        payment_method: result.order.payment_method,
        updated_at: result.order.updated_at,
      },
      verification: result.verification ? {
        id: result.verification.id,
        verified_at: result.verification.verified_at,
        status: result.verification.status,
      } : null,
    });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

module.exports = {
  verifyPayment,
};
