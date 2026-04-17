const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Address = {
    findByUserId: async (userId) => {
        const query = `SELECT * FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`;
        const [rows] = await db.query(query, [userId]);
        return rows;
    },

    findById: async (addressId) => {
        const [rows] = await db.query('SELECT * FROM customer_addresses WHERE address_id = ?', [addressId]);
        return rows[0];
    },

    create: async (data) => {
        const id = uuidv4();
        const { user_id, address_line1, address_line2, city, state, zip_code, country, is_default } = data;
        
        // If is_default is true, unset other defaults for this user
        if (is_default) {
            await db.query('UPDATE customer_addresses SET is_default = FALSE WHERE user_id = ?', [user_id]);
        }

        const query = `
            INSERT INTO customer_addresses (address_id, user_id, address_line1, address_line2, city, state, zip_code, country, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.query(query, [id, user_id, address_line1, address_line2, city, state, zip_code, country || 'India', is_default || false]);
        return id;
    },

    update: async (id, data) => {
        const fields = [];
        const params = [];
        const allowedFields = ['address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country', 'is_default'];

        if (data.is_default) {
            const addr = await Address.findById(id);
            if (addr) {
                await db.query('UPDATE customer_addresses SET is_default = FALSE WHERE user_id = ?', [addr.user_id]);
            }
        }

        Object.keys(data).forEach(key => {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                params.push(data[key]);
            }
        });

        if (fields.length === 0) return false;

        params.push(id);
        const query = `UPDATE customer_addresses SET ${fields.join(', ')} WHERE address_id = ?`;
        const [result] = await db.query(query, params);
        return result.affectedRows > 0;
    },

    delete: async (id) => {
        const [result] = await db.query('DELETE FROM customer_addresses WHERE address_id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Address;
