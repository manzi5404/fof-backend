const { pool } = require('../db/connection');

async function getSettings() {
    try {
        const result = await pool.query('SELECT key, value FROM settings');
        return result.rows.reduce((acc, row) => {
            acc[row.key] = row.value === 'true' ? true : row.value === 'false' ? false : row.value;
            return acc;
        }, {});
    } catch (error) {
        console.error('❌ Database error in settingsModel.getSettings():', error.message);
        throw new Error('Database failed to fetch settings. Ensure the settings table exists.');
    }
}

async function updateSetting(settingKey, settingValue) {
    try {
        const result = await pool.query(
            'UPDATE settings SET value = $1 WHERE key = $2',
            [String(settingValue ?? ''), settingKey]
        );
        return result.rowCount > 0;
    } catch (error) {
        console.error('❌ Database error in settingsModel.updateSetting():', error.message);
        throw new Error(`Database failed to update setting "${settingKey}".`);
    }
}

module.exports = { getSettings, updateSetting };