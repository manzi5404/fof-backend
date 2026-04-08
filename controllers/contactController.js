const contactMessage = require('../models/contactMessage');
const notification = require('../models/notification');

const submitContactForm = async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            message: 'Name, email, and message are required'
        });
    }

    try {
        const messageId = await contactMessage.createMessage({
            name,
            email,
            subject,
            message
        });

        // Create notification for admin
        await notification.createNotification(
            'message',
            messageId,
            `New message from ${name}`,
            `Subject: ${subject || 'General Inquiry'} - ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`
        );

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            messageId
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
};

const getMessages = async (req, res) => {
    try {
        const filters = {};
        if (req.query.status) {
            filters.status = req.query.status;
        }
        const messages = await contactMessage.getMessages(filters);
        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            messages: [],
            error: error.message
        });
    }
};

const getMessageById = async (req, res) => {
    try {
        const msg = await contactMessage.getMessageById(req.params.id);
        if (!msg) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }
        res.json({ success: true, message: msg });
    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch message',
            error: error.message
        });
    }
};

const updateMessageStatus = async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['unread', 'read', 'replied'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status. Must be: unread, read, or replied'
        });
    }

    try {
        const updated = await contactMessage.updateMessageStatus(req.params.id, status);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }
        res.json({
            success: true,
            message: 'Message status updated'
        });
    } catch (error) {
        console.error('Update message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update message',
            error: error.message
        });
    }
};

module.exports = {
    submitContactForm,
    getMessages,
    getMessageById,
    updateMessageStatus
};