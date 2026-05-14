const db = require('../config/database');

const ShippingZone = {
    findAll: async () => {
        const [rows] = await db.query('SELECT * FROM shipping_zones ORDER BY created_at DESC');
        return rows.map(row => ({
            zone_id: row.zone_id,
            zone_name: row.zone_name,
            zone_type: row.zone_type,
            states: row.zone_type === 'state' ? JSON.parse(row.zone_values || '[]') : [],
            pincodes: row.zone_type === 'pincode' ? JSON.parse(row.zone_values || '[]') : [],
            shipping_charge: row.base_charge,
            free_shipping_above: row.free_threshold,
            estimated_days: row.estimated_days || '3-5 Days',
            status: row.is_active === 1,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
    },

    create: async (data) => {
        const { zone_name, states, shipping_charge, free_shipping_above, status } = data;
        const sql = `
            INSERT INTO shipping_zones (zone_name, zone_type, zone_values, base_charge, free_threshold, estimated_days, is_active)
            VALUES (?, 'state', ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [
            zone_name, 
            JSON.stringify(states || []), 
            shipping_charge, 
            free_shipping_above || null, 
            data.estimated_days || '3-5 Days',
            status !== undefined ? (status ? 1 : 0) : 1
        ]);
        return result.insertId;
    },

    update: async (id, data) => {
        const { zone_name, states, shipping_charge, free_shipping_above, status } = data;
        const sql = `
            UPDATE shipping_zones SET 
                zone_name = ?, zone_values = ?, base_charge = ?, 
                free_threshold = ?, estimated_days = ?, is_active = ?
            WHERE zone_id = ?
        `;
        await db.query(sql, [
            zone_name, 
            JSON.stringify(states || []), 
            shipping_charge, 
            free_shipping_above || null, 
            data.estimated_days || '3-5 Days',
            status ? 1 : 0, 
            id
        ]);
    },

    delete: async (id) => {
        await db.query('DELETE FROM shipping_zones WHERE zone_id = ?', [id]);
    },

    calculateCharge: async (state, subtotal = 0) => {
        const [zones] = await db.query('SELECT * FROM shipping_zones WHERE is_active = 1 AND zone_type = "state"');
        
        let matchedZone = null;
        for (const zone of zones) {
            const states = JSON.parse(zone.zone_values || '[]');
            if (states.includes(state)) {
                matchedZone = zone;
                break;
            }
        }

        if (!matchedZone) {
            // Fallback to "Rest of India" or similar if no match
            const [fallback] = await db.query('SELECT * FROM shipping_zones WHERE zone_name LIKE "%Rest of India%" AND is_active = 1 LIMIT 1');
            matchedZone = fallback[0] || null;
        }

        if (!matchedZone) return { shippingCharge: 0, zone: 'Standard Shipping', free_threshold: 500 };

        // Check for free shipping limit
        if (matchedZone.free_threshold && parseFloat(subtotal) >= parseFloat(matchedZone.free_threshold)) {
            return { 
                shippingCharge: 0, 
                zone: matchedZone.zone_name, 
                isFree: true,
                free_threshold: matchedZone.free_threshold,
                estimated_days: matchedZone.estimated_days || '3-5 Days'
            };
        }

        return { 
            shippingCharge: parseFloat(matchedZone.base_charge), 
            zone: matchedZone.zone_name,
            estimated_days: matchedZone.estimated_days || '3-5 Days',
            free_threshold: matchedZone.free_threshold
        };
    }
};

module.exports = ShippingZone;
