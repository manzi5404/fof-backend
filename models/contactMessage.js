const { pool } = require('../db/connection');

async function createMessage(data) {
    const { name, email, subject, message } = data;
    const [result] = await pool.query(
        `INSERT INTO contact_messages (name, email, subject, message, status)
         VALUES (?, ?, ?, ?, 'unread')`,
        [name, email, subject || 'General Inquiry', message]
    );
    return result.insertId;
}

async function getMessages(filters = {}) {
    let query = 'SELECT * FROM contact_messages';
    const params = [];

    if (filters.status) {
        query += ' WHERE status = ?';
        params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(query, params);
    return rows;
}

async function getMessageById(id) {
    const [rows] = await pool.query('SELECT * FROM contact_messages WHERE id = ?', [id]);
    return rows[0] || null;
}

async function updateMessageStatus(id, status) {
    const [result] = await pool.query(
        'UPDATE contact_messages SET status = ? WHERE id = ?',
        [status, id]
    );
    return result.affectedRows > 0;
}

module.exports = {
    createMessage,
    getMessages,
    getMessageById,
    updateMessageStatus
};