const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const User = {
    findByEmail: async (email) => {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    findById: async (userId) => {
        const [rows] = await db.query('SELECT user_id, name, email, role, status, permissions, created_at FROM users WHERE user_id = ?', [userId]);
        return rows[0];
    },

    createUser: async (userData) => {
        const { name, email, password, role, phone, permissions } = userData;
        const userId = uuidv4();
        
        const [result] = await db.query(
            'INSERT INTO users (user_id, name, email, password, role, phone, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, name, email, password, role || 'user', phone || null, permissions ? JSON.stringify(permissions) : null]
        );
        return userId;
    },

    findAllAdmins: async () => {
        const [rows] = await db.query(
            "SELECT user_id, name, email, role, status, permissions, created_at FROM users WHERE role IN ('superadmin', 'subadmin') ORDER BY created_at DESC"
        );
        // Parse permissions if they are returned as string or JSON
        return rows.map(admin => ({
            ...admin,
            permissions: typeof admin.permissions === 'string' ? JSON.parse(admin.permissions) : admin.permissions
        }));
    },

    updateAdmin: async (adminId, updateData) => {
        const { name, email, role, status, permissions } = updateData;
        
        // Construct dynamic update fields
        const fields = [];
        const values = [];

        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (email !== undefined) { fields.push('email = ?'); values.push(email); }
        if (role !== undefined) { fields.push('role = ?'); values.push(role); }
        if (status !== undefined) { fields.push('status = ?'); values.push(status); }
        if (permissions !== undefined) { 
            fields.push('permissions = ?'); 
            values.push(permissions ? JSON.stringify(permissions) : null); 
        }

        if (fields.length === 0) return false;

        values.push(adminId);
        const [result] = await db.query(
            `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
            values
        );
        return result.affectedRows > 0;
    }
};

module.exports = User;
