const { pool } = require('../db/connection');
const { normalizeStoreMode, isReservationMode } = require('../utils/storeMode');

const getStoreConfigColumns = async () => {
    const [columns] = await pool.query(
        `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'store_config'
        `
    );
    return new Set(columns.map((c) => c.COLUMN_NAME));
};

const getStoreConfig = async (req, res) => {
    try {
        const columns = await getStoreConfigColumns();
        let [rows] = await pool.query('SELECT * FROM store_config WHERE id = 1');

        if (rows.length === 0) {
            // Auto-initialize if missing (compatible with legacy/new schema variants)
            const hasAnnouncement = columns.has('announcement');
            const hasAnnouncementMessage = columns.has('announcement_message');
            if (hasAnnouncement) {
                await pool.query('INSERT INTO store_config (id, store_mode, announcement) VALUES (1, "closed", "Welcome to Faith Over Fear")');
            } else if (hasAnnouncementMessage) {
                await pool.query('INSERT INTO store_config (id, store_mode, announcement_message) VALUES (1, "closed", "Welcome to Faith Over Fear")');
            } else {
                await pool.query('INSERT INTO store_config (id, store_mode) VALUES (1, "closed")');
            }
            [rows] = await pool.query('SELECT * FROM store_config WHERE id = 1');
        }

        const rawConfig = rows[0] || {};
        const normalizedMode = normalizeStoreMode(rawConfig.store_mode || rawConfig.mode);
        const reservationEnabled = isReservationMode(normalizedMode);
        const normalizedConfig = {
            ...rawConfig,
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

        const columns = await getStoreConfigColumns();
        const normalizedMode = normalizeStoreMode(store_mode || 'closed');
        const resolvedAnnouncement = announcement_message ?? announcement ?? '';

        const updates = [];
        const values = [];

        if (columns.has('store_mode')) {
            updates.push('store_mode = ?');
            values.push(normalizedMode);
        } else if (columns.has('mode')) {
            updates.push('mode = ?');
            values.push(normalizedMode);
        }
        if (columns.has('announcement')) {
            updates.push('announcement = ?');
            values.push(resolvedAnnouncement);
        }
        if (columns.has('announcement_message')) {
            updates.push('announcement_message = ?');
            values.push(resolvedAnnouncement);
        }
        if (columns.has('banner_enabled') && typeof banner_enabled !== 'undefined') {
            updates.push('banner_enabled = ?');
            values.push(Boolean(banner_enabled) ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(500).json({ success: false, message: 'No writable store_config fields found' });
        }

        values.push(1);
        await pool.query(`UPDATE store_config SET ${updates.join(', ')} WHERE id = ?`, values);

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
