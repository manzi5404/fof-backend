const { pool } = require('../db/connection');

async function getLatestAnnouncement() {
    const result = await pool.query(
        'SELECT * FROM announcements WHERE id = 1 LIMIT 1'
    );
    return result.rows[0] || null;
}

async function updateAnnouncement(data) {
    const { title, message, image_url, button_text, is_enabled, status } = data;
    const version = Math.floor(Date.now() / 1000);

    const result = await pool.query(
        `UPDATE announcements 
         SET title = $1, message = $2, image_url = $3, button_text = $4, is_enabled = $5, version = $6, status = $7 
         WHERE id = 1
         RETURNING *`,
        [title, message, image_url || null, button_text || 'SHOP THE DROP', is_enabled ?? true, version, status || 'live']
    );
    
    if (result.rowCount === 0) {
        const insertResult = await pool.query(
            `INSERT INTO announcements (id, title, message, image_url, button_text, is_enabled, version, status) 
             VALUES (1, $1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [title, message, image_url || null, button_text || 'SHOP THE DROP', is_enabled ?? true, version, status || 'live']
        );
        return insertResult.rows[0];
    }
    
    return result.rows[0];
}

module.exports = { getLatestAnnouncement, updateAnnouncement };