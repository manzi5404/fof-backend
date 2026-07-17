const { pool } = require('../db/connection');

async function createResetToken(userId, token, expiresAt) {
    const result = await pool.query(
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id',
        [userId, token, expiresAt]
    );
    return result.rows[0].id;
}

async function getTokenInfo(token) {
    const result = await pool.query(
        'SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW()',
        [token]
    );
    return result.rows[0];
}

async function deleteToken(token) {
    const result = await pool.query('DELETE FROM password_resets WHERE token = $1', [token]);
    return result.rowCount > 0;
}

async function deleteTokensByUserId(userId) {
    const result = await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
    return result.rowCount > 0;
}

module.exports = {
    createResetToken,
    getTokenInfo,
    deleteToken,
    deleteTokensByUserId
};