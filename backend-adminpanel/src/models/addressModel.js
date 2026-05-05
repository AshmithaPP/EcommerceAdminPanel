const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Address = {
    create: async (userId, data) => {
        const addressId = uuidv4();
        const {
            full_name, phone, email, address_line1, address_line2,
            landmark, city, state, postal_code, country,
            address_type, is_default
        } = data;

        // If this is set as default, unset others first
        if (is_default) {
            await Address.unsetDefaultAll(userId);
        }

        const sql = `
            INSERT INTO addresses (
                address_id, user_id, full_name, phone, email, 
                address_line1, address_line2, landmark, city, 
                state, postal_code, country, address_type, is_default
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.query(sql, [
            addressId, userId, full_name, phone, email,
            address_line1, address_line2, landmark, city,
            state, postal_code, country || 'India', 
            address_type || 'home', is_default ? 1 : 0
        ]);

        return { address_id: addressId, ...data };
    },

    findAllByUserId: async (userId) => {
        const [rows] = await db.query(
            'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
            [userId]
        );
        return rows;
    },

    findById: async (addressId) => {
        const [rows] = await db.query('SELECT * FROM addresses WHERE address_id = ?', [addressId]);
        return rows[0];
    },

    update: async (addressId, userId, data) => {
        if (data.is_default) {
            await Address.unsetDefaultAll(userId);
        }

        const fields = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (key !== 'address_id' && key !== 'user_id' && key !== 'created_at') {
                fields.push(`${key} = ?`);
                values.push(data[key] === true ? 1 : (data[key] === false ? 0 : data[key]));
            }
        });

        if (fields.length === 0) return null;

        values.push(addressId);
        const sql = `UPDATE addresses SET ${fields.join(', ')} WHERE address_id = ?`;
        await db.query(sql, values);

        return await Address.findById(addressId);
    },

    delete: async (addressId, userId) => {
        const address = await Address.findById(addressId);
        if (!address) return false;

        await db.query('DELETE FROM addresses WHERE address_id = ?', [addressId]);

        // If we deleted the default address, make the most recent one default
        if (address.is_default) {
            const [others] = await db.query(
                'SELECT address_id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                [userId]
            );
            if (others.length > 0) {
                await db.query(
                    'UPDATE addresses SET is_default = 1 WHERE address_id = ?',
                    [others[0].address_id]
                );
            }
        }
        return true;
    },

    unsetDefaultAll: async (userId) => {
        await db.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }
};

module.exports = Address;
