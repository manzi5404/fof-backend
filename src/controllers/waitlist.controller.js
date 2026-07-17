const waitlistService = require('../services/waitlist.service');
const { handleServiceError } = require('../utils/responseHandler');

async function addToWaitlist(req, res) {
  try {
    const entry = await waitlistService.addToWaitlist(req.body);
    return res.status(201).json({
      success: true,
      message: 'Added to waitlist successfully',
      entry,
    });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getAllForAdmin(req, res) {
  try {
    const entries = await waitlistService.getAllForAdmin();
    return res.status(200).json({ success: true, entries });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

module.exports = {
  addToWaitlist,
  getAllForAdmin,
};
