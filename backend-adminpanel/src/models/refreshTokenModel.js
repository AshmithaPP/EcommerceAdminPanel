const db = require('../config/database');

const RefreshToken = {
    save: async (userId, token, expiresAt) => {
        const [result] = await db.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [userId, token, expiresAt]
        );
        return result.insertId;
    },

    findByToken: async (token) => {
        const [rows] = await db.query('SELECT * FROM refresh_tokens WHERE token = ?', [token]);
        return rows[0];
    },

    findByUserId: async (userId) => {
        const [rows] = await db.query('SELECT * FROM refresh_tokens WHERE user_id = ?', [userId]);
        return rows[0];
    },

    deleteByToken: async (token) => {
        const [result] = await db.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
        return result.affectedRows > 0;
    },

    deleteByUserId: async (userId) => {
        const [result] = await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
        return result.affectedRows > 0;
    }
};

module.exports = RefreshToken;
