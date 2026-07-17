const announcementModel = require('../models/announcement');
const appEmitter = require('../utils/events');

const ALLOWED_ANNOUNCEMENT_FIELDS = ['title', 'message', 'image_url', 'button_text', 'is_enabled', 'status'];

function sanitizeAnnouncementInput(body) {
    const data = {};
    ALLOWED_ANNOUNCEMENT_FIELDS.forEach((field) => {
        if (body[field] !== undefined) {
            data[field] = body[field];
        }
    });
    return data;
}

async function getLatestAnnouncement(req, res) {
    try {
        const announcement = await announcementModel.getLatestAnnouncement();
        res.json({ success: true, announcement });
    } catch (err) {
        console.error('Error fetching announcement:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function updateAnnouncement(req, res) {
    try {
        const data = sanitizeAnnouncementInput(req.body);
        if (!data.title) {
            return res.status(400).json({ success: false, message: 'title is required' });
        }
        const announcement = await announcementModel.updateAnnouncement(data);
        
        appEmitter.emit('announcement_update', announcement);
        
        res.json({ success: true, message: 'Announcement updated successfully', announcement });
    } catch (err) {
        console.error('❌ ANNOUNCEMENT_UPDATE_ERROR:', err);
        res.status(500).json({ success: false, message: 'Database update failed', error: err.message });
    }
}

/**
 * Server-Sent Events (SSE) Endpoint
 * Clients subscribe to this to receive immediate announcement updates 
 * without polling the API.
 */
function streamAnnouncements(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onUpdate = (announcement) => {
        res.write(`data: ${JSON.stringify(announcement)}\n\n`);
    };

    appEmitter.on('announcement_update', onUpdate);

    // Initial heartbeats or data can be sent here
    req.on('close', () => {
        appEmitter.removeListener('announcement_update', onUpdate);
    });
}

module.exports = { 
    getLatestAnnouncement, 
    updateAnnouncement,
    streamAnnouncements 
};
