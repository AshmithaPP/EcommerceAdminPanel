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
    },

    getReportData: async (startDate, endDate) => {
        const sql = `
            SELECT 
                p.payment_id as 'Invoice No',
                o.order_number as 'Order ID',
                p.gateway_payment_id as 'Transaction ID',
                DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') as 'Payment Date & Time',
                u.name as 'Customer Name',
                u.email as 'Customer Email',
                u.phone as 'Customer Mobile',
                o.payment_method as 'Payment Method',
                p.gateway as 'Payment Gateway',
                p.status as 'Payment Status',
                o.subtotal as 'Subtotal',
                o.discount as 'Discount',
                o.delivery_fee as 'Shipping Charge',
                o.gst_amount as 'GST/Tax',
                o.total_amount as 'Total Amount',
                0 as 'Refund Amount',
                'INR' as 'Currency',
                DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') as 'Created Date',
                DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') as 'Updated Date',
                o.status as 'Order Status',
                o.status as 'Delivery Status',
                o.coupon_id as 'Coupon Code Used',
                p.gateway_order_id as 'Gateway Reference ID'
            FROM payments p
            JOIN orders o ON p.order_id = o.order_id
            JOIN users u ON o.user_id = u.user_id
            WHERE DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?
            ORDER BY p.created_at DESC
        `;
        const [rows] = await db.query(sql, [startDate, endDate]);
        return rows;
    }
};

module.exports = Payment;
