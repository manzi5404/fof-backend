const settingsModel = require('../models/settings');

async function getSettings(req, res) {
    try {
        const settings = await settingsModel.getSettings();
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function updateSetting(req, res) {
    try {
        const { setting_key, setting_value } = req.body;
        if (!setting_key || typeof setting_key !== 'string') {
            return res.status(400).json({ success: false, message: 'setting_key is required and must be a string' });
        }
        if (setting_value === undefined || setting_value === null) {
            return res.status(400).json({ success: false, message: 'setting_value is required' });
        }
        const success = await settingsModel.updateSetting(setting_key, String(setting_value));
        res.json({ success });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = { getSettings, updateSetting };
