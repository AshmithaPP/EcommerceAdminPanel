const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Customer = {
    findAll: async ({ search, status, limit = 10, offset = 0 }) => {
        let query = `
            SELECT 
                user_id, name, email, phone, status, created_at,
                (SELECT COUNT(*) FROM orders WHERE user_id = users.user_id) as orders_count,
                (SELECT IFNULL(SUM(total_amount), 0) FROM orders WHERE user_id = users.user_id) as total_spent
            FROM users 
            WHERE role = 'user'
        `;
        const params = [];

        if (search) {
            query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (status !== undefined) {
            query += ` AND status = ?`;
            params.push(status);
        }

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.query(query, params);
        return { customers: rows, total };
    },

    findById: async (id) => {
        const query = `
            SELECT user_id, name, email, phone, status, created_at 
            FROM users 
            WHERE user_id = ? AND role = 'user'
        `;
        const [rows] = await db.query(query, [id]);
        return rows[0];
    },

    create: async ({ name, email, phone, password, status = 1 }) => {
        const id = uuidv4();
        const query = `
            INSERT INTO users (user_id, name, email, phone, password, role, status) 
            VALUES (?, ?, ?, ?, ?, 'user', ?)
        `;
        // Note: Password should be hashed in service layer
        await db.query(query, [id, name, email, phone, password || 'default_password', status]);
        return id;
    },

    update: async (id, data) => {
        const fields = [];
        const params = [];
        
        Object.keys(data).forEach(key => {
            if (['name', 'email', 'phone', 'status'].includes(key)) {
                fields.push(`${key} = ?`);
                params.push(data[key]);
            }
        });

        if (fields.length === 0) return false;

        params.push(id);
        const query = `UPDATE users SET ${fields.join(', ')} WHERE user_id = ? AND role = 'user'`;
        const [result] = await db.query(query, params);
        return result.affectedRows > 0;
    },

    findByPhone: async (phone) => {
        const [rows] = await db.query('SELECT user_id FROM users WHERE phone = ?', [phone]);
        return rows[0];
    }
};

module.exports = Customer;
