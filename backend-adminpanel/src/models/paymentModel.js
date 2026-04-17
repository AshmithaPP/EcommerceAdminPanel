const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Payment = {
    create: async (paymentData) => {
        const { order_id, razorpay_order_id, amount, currency = 'INR' } = paymentData;
        const payment_id = uuidv4();
        
        const query = `
            INSERT INTO payments (payment_id, order_id, razorpay_order_id, amount, currency, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        `;
        
        await db.query(query, [payment_id, order_id, razorpay_order_id, amount, currency]);
        return { payment_id, ...paymentData, status: 'pending' };
    },

    updateStatus: async (razorpayOrderId, status, razorpayPaymentId = null, razorpaySignature = null) => {
        const query = `
            UPDATE payments 
            SET status = ?, razorpay_payment_id = ?, razorpay_signature = ?, updated_at = CURRENT_TIMESTAMP
            WHERE razorpay_order_id = ?
        `;
        const [result] = await db.query(query, [status, razorpayPaymentId, razorpaySignature, razorpayOrderId]);
        return result.affectedRows > 0;
    },

    findByRazorpayOrderId: async (razorpayOrderId) => {
        const query = `SELECT * FROM payments WHERE razorpay_order_id = ?`;
        const [rows] = await db.query(query, [razorpayOrderId]);
        return rows[0];
    },

    findAll: async ({ limit = 10, offset = 0 } = {}) => {
        const query = `
            SELECT p.*, o.order_number, o.payment_method, u.name as customer_name, u.email as customer_email
            FROM payments p
            JOIN orders o ON p.order_id = o.order_id
            JOIN users u ON o.user_id = u.user_id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await db.query(query, [parseInt(limit), parseInt(offset)]);
        
        const countQuery = `SELECT COUNT(*) as total FROM payments`;
        const [countResult] = await db.query(countQuery);
        
        return { payments: rows, total: countResult[0].total };
    }
};

module.exports = Payment;
