const { pool } = require('../db/connection');

async function getSettings() {
    try {
        const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
        return rows.reduce((acc, row) => {
            // Handle boolean conversions for common setting types
            acc[row.setting_key] = row.setting_value === 'true' ? true : row.setting_value === 'false' ? false : row.setting_value;
            return acc;
        }, {});
    } catch (error) {
        console.error('❌ Database error in settingsModel.getSettings():', error.message);
        throw new Error('Database failed to fetch settings. Ensure the settings table exists.');
    }
}

async function updateSetting(settingKey, settingValue) {
    try {
        const [result] = await pool.query(
            'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
            [String(settingValue), settingKey]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('❌ Database error in settingsModel.updateSetting():', error.message);
        throw new Error(`Database failed to update setting "${settingKey}".`);
    }
}

module.exports = { getSettings, updateSetting };
