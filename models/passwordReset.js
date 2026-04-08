const { pool } = require('../db/connection');

async function createResetToken(userId, token, expiresAt) {
    const [result] = await pool.query(
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, token, expiresAt]
    );
    return result.insertId;
}

async function getTokenInfo(token) {
    const [rows] = await pool.query(
        'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()',
        [token]
    );
    return rows[0];
}

async function deleteToken(token) {
    const [result] = await pool.query('DELETE FROM password_resets WHERE token = ?', [token]);
    return result.affectedRows > 0;
}

async function deleteTokensByUserId(userId) {
    const [result] = await pool.query('DELETE FROM password_resets WHERE user_id = ?', [userId]);
    return result.affectedRows > 0;
}

module.exports = {
    createResetToken,
    getTokenInfo,
    deleteToken,
    deleteTokensByUserId
};
