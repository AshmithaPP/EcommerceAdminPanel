const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Address = {
    create: async ({ user_id, address_line1, address_line2, city, state, zip_code, country, is_default }) => {
        const addressId = uuidv4();

        // If this is set as default, unset others first
        if (is_default) {
            await Address.unsetDefaultAll(user_id);
        }

        const sql = `
            INSERT INTO customer_addresses (
                address_id, user_id, address_line1, address_line2, city, 
                state, zip_code, country, is_default
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.query(sql, [
            addressId, user_id, address_line1, address_line2 || null, 
            city, state, zip_code, country || 'India', is_default ? 1 : 0
        ]);

        return { address_id: addressId, user_id, address_line1, address_line2, city, state, zip_code, country, is_default };
    },

    findByUserId: async (userId) => {
        const [rows] = await db.query(
            'SELECT * FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
            [userId]
        );
        return rows;
    },

    findById: async (addressId) => {
        const [rows] = await db.query('SELECT * FROM customer_addresses WHERE address_id = ?', [addressId]);
        return rows[0];
    },

    update: async (addressId, data) => {
        const fields = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (['address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country', 'is_default'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(data[key] === true ? 1 : (data[key] === false ? 0 : data[key]));
            }
        });

        if (fields.length === 0) return null;

        values.push(addressId);
        const sql = `UPDATE customer_addresses SET ${fields.join(', ')} WHERE address_id = ?`;
        await db.query(sql, values);

        return await Address.findById(addressId);
    },

    delete: async (addressId) => {
        return await db.query('DELETE FROM customer_addresses WHERE address_id = ?', [addressId]);
    },

    unsetDefaultAll: async (userId) => {
        await db.query('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }
};

module.exports = Address;
