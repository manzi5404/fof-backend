const { pool } = require('../db/connection');

async function createUser(user) {
    const { email, password_hash, name, google_id } = user;
    const [result] = await pool.query(
        'INSERT INTO users (email, password_hash, name, google_id) VALUES (?, ?, ?, ?)',
        [email, password_hash, name, google_id || null]
    );
    return result.insertId;
}

async function getUserByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
}

async function getUserById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
}

async function getUserByGoogleId(googleId) {
    const [rows] = await pool.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
    return rows[0];
}

async function updatePassword(userId, newPasswordHash) {
    const [result] = await pool.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId]
    );
    return result.affectedRows > 0;
}

async function getAllUserEmails() {
    // Quality Control: Ensure no duplicates or empty/null addresses 
    const [rows] = await pool.query(`
        SELECT DISTINCT email 
        FROM users 
        WHERE email IS NOT NULL 
          AND email != '' 
          AND email LIKE '%@%'
    `);
    return rows.map(row => row.email);
}

async function linkGoogleAccount(userId, googleId) {
    const [result] = await pool.query(
        'UPDATE users SET google_id = ? WHERE id = ?',
        [googleId, userId]
    );
    return result.affectedRows > 0;
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
