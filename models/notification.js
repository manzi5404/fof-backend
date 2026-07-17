const { pool } = require('../db/connection');

async function createNotification(type, referenceId, title, description) {
    const result = await pool.query(
        `INSERT INTO notifications (type, reference_id, title, description, is_seen)
         VALUES ($1, $2, $3, $4, false)
         RETURNING id`,
        [type, referenceId, title, description || null]
    );
    return result.rows[0].id;
}

async function getNotifications(isSeen = null) {
    let query = 'SELECT * FROM notifications';
    const params = [];
    let paramIndex = 1;

    if (isSeen !== null) {
        query += ' WHERE is_seen = $' + paramIndex;
        params.push(isSeen);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await pool.query(query, params);
    return result.rows;
}

async function markAsSeen(id) {
    const result = await pool.query(
        'UPDATE notifications SET is_seen = true WHERE id = $1',
        [id]
    );
    return result.rowCount > 0;
}

async function markAllAsSeen() {
    const result = await pool.query(
        'UPDATE notifications SET is_seen = true WHERE is_seen = false'
    );
    return result.rowCount;
}

async function getUnseenCount() {
    const result = await pool.query(
        'SELECT COUNT(*) as count FROM notifications WHERE is_seen = false'
    );
    return parseInt(result.rows[0].count);
}

module.exports = {
    createNotification,
    getNotifications,
    markAsSeen,
    markAllAsSeen,
    getUnseenCount
};