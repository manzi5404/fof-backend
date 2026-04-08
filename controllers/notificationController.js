const notification = require('../models/notification');

const getNotifications = async (req, res) => {
    try {
        const isSeen = req.query.unseen === 'true' ? false : null;
        const notifications = await notification.getNotifications(isSeen);
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

const markAsSeen = async (req, res) => {
    try {
        const updated = await notification.markAsSeen(req.params.id);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        res.json({ success: true, message: 'Notification marked as seen' });
    } catch (error) {
        console.error('Mark notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification',
            error: error.message
        });
    }
};

const markAllSeen = async (req, res) => {
    try {
        const count = await notification.markAllAsSeen();
        res.json({
            success: true,
            message: `Marked ${count} notifications as seen`
        });
    } catch (error) {
        console.error('Mark all notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications',
            error: error.message
        });
    }
};

const getUnseenCount = async (req, res) => {
    try {
        const count = await notification.getUnseenCount();
        res.json({ success: true, count });
    } catch (error) {
        console.error('Get notification count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notification count',
            error: error.message
        });
    }
};

module.exports = {
    getNotifications,
    markAsSeen,
    markAllSeen,
    getUnseenCount
};