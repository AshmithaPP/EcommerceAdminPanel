const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const User = {
    findByEmail: async (email) => {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    findById: async (userId) => {
        const [rows] = await db.query('SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?', [userId]);
        return rows[0];
    },

    createUser: async (userData) => {
        const { name, email, password, role, phone } = userData;
        const userId = uuidv4();
        
        const [result] = await db.query(
            'INSERT INTO users (user_id, name, email, password, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, name, email, password, role || 'user', phone || null]
        );
        return userId;
    }
};

module.exports = User;
