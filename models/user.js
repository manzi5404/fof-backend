const { pool } = require('../db/connection');

async function createUser(user) {
    const { email, password_hash, name, google_id } = user;
    const result = await pool.query(
        'INSERT INTO users (email, password_hash, name, google_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [email, password_hash, name, google_id || null]
    );
    return result.rows[0].id;
}

async function getUserByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
}

async function getUserById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
}

async function getUserByGoogleId(googleId) {
    const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    return result.rows[0];
}

async function updatePassword(userId, newPasswordHash) {
    const result = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, userId]
    );
    return result.rowCount > 0;
}

async function getAllUserEmails() {
    const result = await pool.query(`
        SELECT DISTINCT email 
        FROM users 
        WHERE email IS NOT NULL 
          AND email != '' 
          AND email LIKE '%@%'
    `);
    return result.rows.map(row => row.email);
}

async function linkGoogleAccount(userId, googleId) {
    const result = await pool.query(
        'UPDATE users SET google_id = $1 WHERE id = $2',
        [googleId, userId]
    );
    return result.rowCount > 0;
}

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    getUserByGoogleId,
    updatePassword,
    getAllUserEmails,
    linkGoogleAccount
};
