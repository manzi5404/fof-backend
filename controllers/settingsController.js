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
        const success = await settingsModel.updateSetting(setting_key, setting_value);
        res.json({ success });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = { getSettings, updateSetting };
