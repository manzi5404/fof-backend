const { pool } = require('../db/connection');

async function createMessage(data) {
    const { name, email, subject, message } = data;
    const result = await pool.query(
        `INSERT INTO contact_messages (name, email, subject, message, status)
         VALUES ($1, $2, $3, $4, 'unread')
         RETURNING id`,
        [name, email, subject || 'General Inquiry', message]
    );
    return result.rows[0].id;
}

async function getMessages(filters = {}) {
    let query = 'SELECT * FROM contact_messages';
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
        query += ' WHERE status = $' + paramIndex;
        params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
}

async function getMessageById(id) {
    const result = await pool.query('SELECT * FROM contact_messages WHERE id = $1', [id]);
    return result.rows[0] || null;
}

async function updateMessageStatus(id, status) {
    const result = await pool.query(
        'UPDATE contact_messages SET status = $1 WHERE id = $2',
        [status, id]
    );
    return result.rowCount > 0;
}

module.exports = {
    createMessage,
    getMessages,
    getMessageById,
    updateMessageStatus
};