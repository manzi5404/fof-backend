const messageService = require('../services/message.service');
const { handleServiceError } = require('../utils/responseHandler');

async function getMessages(req, res) {
  try {
    const status = req.query.status || '';
    const messages = await messageService.getAll(status);
    return res.status(200).json({ success: true, messages });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function getMessage(req, res) {
  try {
    const message = await messageService.getById(req.params.id);
    return res.status(200).json({ success: true, message });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function updateMessageStatus(req, res) {
  try {
    const message = await messageService.updateStatus(req.params.id, req.body.status);
    return res.status(200).json({ success: true, message });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

async function createMessage(req, res) {
  try {
    const message = await messageService.create(req.body);
    return res.status(201).json({ success: true, message });
  } catch (err) {
    return handleServiceError(res, err, req);
  }
}

module.exports = {
  getMessages,
  getMessage,
  updateMessageStatus,
  createMessage,
};
