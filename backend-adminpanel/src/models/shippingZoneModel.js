const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const ShippingZone = {
    findAll: async () => {
        const sql = `SELECT * FROM shipping_zones ORDER BY zone_name ASC`;
        const [rows] = await db.query(sql);
        return rows.map(row => ({
            ...row,
            zone_values: JSON.parse(row.zone_values)
        }));
    },

    findById: async (zoneId) => {
        const sql = `SELECT * FROM shipping_zones WHERE zone_id = ?`;
        const [rows] = await db.query(sql, [zoneId]);
        if (!rows[0]) return null;
        return {
            ...rows[0],
            zone_values: JSON.parse(rows[0].zone_values)
        };
    },

    create: async (zoneData) => {
        const { zone_name, zone_type, zone_values, base_charge, free_threshold, is_active } = zoneData;
        const zoneId = uuidv4();
        const sql = `
            INSERT INTO shipping_zones (zone_id, zone_name, zone_type, zone_values, base_charge, free_threshold, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await db.query(sql, [
            zoneId,
            zone_name,
            zone_type,
            JSON.stringify(zone_values),
            base_charge,
            free_threshold || null,
            is_active !== undefined ? is_active : true
        ]);
        return zoneId;
    },

    update: async (zoneId, zoneData) => {
        const { zone_name, zone_type, zone_values, base_charge, free_threshold, is_active } = zoneData;
        const sql = `
            UPDATE shipping_zones 
            SET zone_name = ?, zone_type = ?, zone_values = ?, base_charge = ?, free_threshold = ?, is_active = ?, updated_at = NOW()
            WHERE zone_id = ?
        `;
        const [result] = await db.query(sql, [
            zone_name,
            zone_type,
            JSON.stringify(zone_values),
            base_charge,
            free_threshold || null,
            is_active,
            zoneId
        ]);
        return result.affectedRows > 0;
    },

    delete: async (zoneId) => {
        const sql = `DELETE FROM shipping_zones WHERE zone_id = ?`;
        const [result] = await db.query(sql, [zoneId]);
        return result.affectedRows > 0;
    },

    calculateShipping: async (state, pincode, subtotal) => {
        // 1. Try matching by pincode (Higher priority)
        let sql = `
            SELECT * FROM shipping_zones 
            WHERE zone_type = 'pincode' AND is_active = TRUE
        `;
        const [pincodeZones] = await db.query(sql);
        
        for (const zone of pincodeZones) {
            const values = JSON.parse(zone.zone_values);
            // values could be specific pincodes or ranges like "400001-400099"
            if (ShippingZone.matchPincode(pincode, values)) {
                return ShippingZone.getFinalCharge(zone, subtotal);
            }
        }

        // 2. Try matching by state
        sql = `
            SELECT * FROM shipping_zones 
            WHERE zone_type = 'state' AND is_active = TRUE
        `;
        const [stateZones] = await db.query(sql);
        
        for (const zone of stateZones) {
            const values = JSON.parse(zone.zone_values);
            if (values.map(v => v.toLowerCase()).includes(state.toLowerCase())) {
                return ShippingZone.getFinalCharge(zone, subtotal);
            }
        }

        // 3. Fallback to a default if exists (optional, otherwise 0 or a fixed flat rate)
        return { charge: 0, applied_rule: 'Free Shipping (No matching zone)' };
    },

    matchPincode: (pincode, values) => {
        for (const val of values) {
            if (val.includes('-')) {
                const [start, end] = val.split('-').map(Number);
                const pin = Number(pincode);
                if (pin >= start && pin <= end) return true;
            } else if (val === pincode) {
                return true;
            }
        }
        return false;
    },

    getFinalCharge: (zone, subtotal) => {
        if (zone.free_threshold && subtotal >= zone.free_threshold) {
            return { 
                charge: 0, 
                applied_rule: `Free shipping above ${zone.free_threshold} (${zone.zone_name})`,
                base_charge: zone.base_charge,
                is_free: true
            };
        }
        return { 
            charge: zone.base_charge, 
            applied_rule: `Flat rate for ${zone.zone_name}`,
            base_charge: zone.base_charge,
            is_free: false
        };
    }
};

module.exports = ShippingZone;
