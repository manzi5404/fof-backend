const { pool } = require('../db/connection');

async function createNotification(type, referenceId, title, description) {
    const [result] = await pool.query(
        `INSERT INTO notifications (type, reference_id, title, description, is_seen)
         VALUES (?, ?, ?, ?, FALSE)`,
        [type, referenceId, title, description || null]
    );
    return result.insertId;
}

async function getNotifications(isSeen = null) {
    let query = 'SELECT * FROM notifications';
    const params = [];

    if (isSeen !== null) {
        query += ' WHERE is_seen = ?';
        params.push(isSeen);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await pool.query(query, params);
    return rows;
}

async function markAsSeen(id) {
    const [result] = await pool.query(
        'UPDATE notifications SET is_seen = TRUE WHERE id = ?',
        [id]
    );
    return result.affectedRows > 0;
}

async function markAllAsSeen() {
    const [result] = await pool.query(
        'UPDATE notifications SET is_seen = TRUE WHERE is_seen = FALSE'
    );
    return result.affectedRows;
}

async function getUnseenCount() {
    const [rows] = await pool.query(
        'SELECT COUNT(*) as count FROM notifications WHERE is_seen = FALSE'
    );
    return rows[0].count;
}

module.exports = {
    createNotification,
    getNotifications,
    markAsSeen,
    markAllAsSeen,
    getUnseenCount
};