const { pool } = require('../db/connection');

async function getLatestAnnouncement() {
    const [rows] = await pool.query(
        'SELECT * FROM announcements WHERE id = 1 LIMIT 1'
    );
    return rows[0] || null;
}

async function updateAnnouncement(data) {
    const { title, message, image_url, button_text, is_enabled, status } = data;
    const version = Math.floor(Date.now() / 1000); // Unix timestamp as version

    const [result] = await pool.query(
        `UPDATE announcements 
         SET title = ?, message = ?, image_url = ?, button_text = ?, is_enabled = ?, version = ?, status = ? 
         WHERE id = 1`,
        [title, message, image_url || null, button_text || 'SHOP THE DROP', is_enabled ?? 1, version, status || 'live']
    );
    
    if (result.affectedRows === 0) {
        await pool.query(
            `INSERT INTO announcements (id, title, message, image_url, button_text, is_enabled, version, status) 
             VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
            [title, message, image_url || null, button_text || 'SHOP THE DROP', is_enabled ?? 1, version, status || 'live']
        );
    }
    
    return { id: 1, title, message, image_url, button_text, is_enabled, version, status };
}

module.exports = { getLatestAnnouncement, updateAnnouncement };
