const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Coupon = {
    create: async (couponData) => {
        const couponId = uuidv4();
        const sql = `
            INSERT INTO coupons (
                coupon_id, code, discount_type, discount_value,
                min_order_value, max_discount_cap, expiry_date,
                total_usage_limit, per_user_usage_limit, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(sql, [
            couponId,
            couponData.code,
            couponData.discount_type,
            couponData.discount_value,
            couponData.min_order_value || 0,
            couponData.max_discount_cap || null,
            couponData.expiry_date || null,
            couponData.total_usage_limit || null,
            couponData.per_user_usage_limit || null,
            couponData.is_active ? 1 : 0
        ]);

        return couponId;
    },

    list: async (limit = 50, offset = 0, search = null) => {
        let sql = `SELECT * FROM coupons WHERE 1=1`;
        const params = [];

        if (search) {
            sql += ` AND code LIKE ?`;
            params.push(`%${search}%`);
        }

        sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [coupons] = await db.query(sql, params);
        const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM coupons${search ? ' WHERE code LIKE ?' : ''}` + (search ? '' : ''), search ? [`%${search}%`] : []);

        return { coupons, total };
    },

    findById: async (couponId) => {
        const [rows] = await db.query('SELECT * FROM coupons WHERE coupon_id = ?', [couponId]);
        return rows[0] || null;
    },

    findByCode: async (code) => {
        const [rows] = await db.query('SELECT * FROM coupons WHERE code = ?', [code]);
        return rows[0] || null;
    },

    update: async (couponId, updateData) => {
        const fields = [];
        const params = [];
        
        const allowedFields = [
            'code', 'discount_type', 'discount_value', 'min_order_value', 
            'max_discount_cap', 'expiry_date', 'total_usage_limit', 
            'per_user_usage_limit', 'is_active'
        ];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                params.push(updateData[field]);
            }
        }

        if (fields.length === 0) return false;

        fields.push('updated_at = NOW()');
        const sql = `UPDATE coupons SET ${fields.join(', ')} WHERE coupon_id = ?`;
        params.push(couponId);

        const [result] = await db.query(sql, params);
        return result.affectedRows > 0;
    },

    delete: async (couponId) => {
        const [result] = await db.query('DELETE FROM coupons WHERE coupon_id = ?', [couponId]);
        return result.affectedRows > 0;
    },

    incrementUsageCount: async (couponId, connection = db) => {
        const sql = `UPDATE coupons SET usage_count = usage_count + 1 WHERE coupon_id = ?`;
        await connection.query(sql, [couponId]);
        return true;
    },

    getUserUsageCount: async (couponId, userId) => {
        const [rows] = await db.query(
            'SELECT COUNT(*) as usage_count FROM coupon_usages WHERE coupon_id = ? AND user_id = ?',
            [couponId, userId]
        );
        return rows[0].usage_count || 0;
    },

    recordUsage: async (usageData, connection = db) => {
        const usageId = uuidv4();
        const sql = `
            INSERT INTO coupon_usages (
                usage_id, coupon_id, user_id, order_id, discount_applied
            ) VALUES (?, ?, ?, ?, ?)
        `;
        await connection.query(sql, [
            usageId,
            usageData.coupon_id,
            usageData.user_id,
            usageData.order_id,
            usageData.discount_applied
        ]);
        return usageId;
    },

    getUsageHistory: async (couponId) => {
        const sql = `
            SELECT 
                cu.usage_id, 
                cu.discount_applied, 
                cu.created_at as usage_date,
                o.order_number,
                u.name as customer_name
            FROM coupon_usages cu
            JOIN orders o ON cu.order_id = o.order_id
            JOIN users u ON cu.user_id = u.user_id
            WHERE cu.coupon_id = ?
            ORDER BY cu.created_at DESC
        `;
        const [rows] = await db.query(sql, [couponId]);
        return rows;
    }
};

module.exports = Coupon;
