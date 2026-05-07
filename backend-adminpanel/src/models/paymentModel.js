const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Payment = {
    create: async (data) => {
        const paymentId = uuidv4();
        const { order_id, gateway, gateway_order_id, amount, status } = data;
        
        const sql = `
            INSERT INTO payments (
                payment_id, order_id, gateway, gateway_order_id, amount, status
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.query(sql, [paymentId, order_id, gateway || 'razorpay', gateway_order_id, amount, status || 'pending']);
        return paymentId;
    },

    updateByGatewayOrderId: async (gatewayOrderId, data) => {
        const fields = [];
        const values = [];
        
        Object.keys(data).forEach(key => {
            fields.push(`${key} = ?`);
            values.push(data[key]);
        });
        
        values.push(gatewayOrderId);
        const sql = `UPDATE payments SET ${fields.join(', ')} WHERE gateway_order_id = ?`;
        await db.query(sql, values);
    },

    findByOrderId: async (orderId) => {
        const [rows] = await db.query('SELECT * FROM payments WHERE order_id = ?', [orderId]);
        return rows[0];
    },

    findByGatewayOrderId: async (gatewayOrderId) => {
        const [rows] = await db.query('SELECT * FROM payments WHERE gateway_order_id = ?', [gatewayOrderId]);
        return rows[0];
    },

    findAll: async ({ limit = 10, offset = 0 }) => {
        const [payments] = await db.query(
            `SELECT 
                p.*, 
                o.order_number, 
                u.name as customer_name, 
                u.email as customer_email
             FROM payments p
             JOIN orders o ON p.order_id = o.order_id
             JOIN users u ON o.user_id = u.user_id
             ORDER BY p.created_at DESC 
             LIMIT ? OFFSET ?`,
            [parseInt(limit), parseInt(offset)]
        );
        const [countRows] = await db.query('SELECT COUNT(*) as total FROM payments');
        
        return {
            payments,
            total: countRows[0].total
        };
    }
};

module.exports = Payment;
