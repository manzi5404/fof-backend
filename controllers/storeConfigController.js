const { pool } = require('../db/connection');
const { normalizeStoreMode, isReservationMode } = require('../utils/storeMode');

const getStoreConfigColumns = async () => {
    const result = await pool.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'store_config'
        `
    );
    return new Set(result.rows.map((c) => c.column_name));
};

const getStoreConfig = async (req, res) => {
    try {
        const columns = await getStoreConfigColumns();
        let result = await pool.query('SELECT * FROM store_config WHERE id = 1');

        if (result.rows.length === 0) {
            await pool.query('INSERT INTO store_config (id, store_mode, announcement) VALUES (1, $1, $2)', ['closed', 'Welcome to Faith Over Fear']);
            result = await pool.query('SELECT * FROM store_config WHERE id = 1');
        }

        const row = result.rows[0] || {};
        const normalizedMode = normalizeStoreMode(row.store_mode || row.mode);
        const reservationEnabled = isReservationMode(normalizedMode);
        const normalizedConfig = {
            ...row,
            store_mode: normalizedMode,
            reservation_enabled: reservationEnabled
        };

        console.log('[Reservation Debug][API] /api/store-config response:', {
            store_mode: normalizedConfig.store_mode,
            reservation_enabled: normalizedConfig.reservation_enabled
        });

        res.json({ success: true, config: normalizedConfig, reservation_enabled: reservationEnabled });
    } catch (error) {
        console.error('Fetch Store Config Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch store config', error: 'Internal Server Error' });
    }
};

const updateStoreConfig = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ success: false, message: 'Missing request body' });
        }

        const { store_mode, announcement, announcement_message, banner_enabled } = req.body;
        const validModes = ['live', 'reserve', 'closed', 'reservation'];
        if (store_mode && !validModes.includes(String(store_mode).toLowerCase())) {
            return res.status(400).json({ success: false, message: `Invalid store mode. Allowed: ${validModes.join(', ')}` });
        }

        const normalizedMode = normalizeStoreMode(store_mode || 'closed');
        const resolvedAnnouncement = announcement_message ?? announcement ?? '';

        const updates = [];
        const values = [];
        let paramIndex = 1;

        updates.push('store_mode = $' + paramIndex);
        values.push(normalizedMode);
        paramIndex++;

        updates.push('announcement = $' + paramIndex);
        values.push(resolvedAnnouncement);
        paramIndex++;

        const updateQuery = `UPDATE store_config SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
        values.push(1);
        await pool.query(updateQuery, values);

        res.json({ success: true, message: 'Store configuration updated successfully' });
    } catch (error) {
        console.error('Update Store Config Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update store config', error: 'Internal Server Error' });
    }
};

module.exports = {
    getStoreConfig,
    updateStoreConfig
};