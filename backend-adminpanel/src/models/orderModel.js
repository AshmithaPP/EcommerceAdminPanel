const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Order = {
    findAll: async ({ search, status, payment_status, startDate, endDate, limit = 10, offset = 0 }) => {
        let query = `
            SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (o.order_number LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (status) {
            query += ` AND o.status = ?`;
            params.push(status);
        }

        if (payment_status) {
            query += ` AND o.payment_status = ?`;
            params.push(payment_status);
        }

        if (startDate && endDate) {
            query += ` AND DATE(o.created_at) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;

        query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.query(query, params);
        return { orders: rows, total };
    },

    // ... rest of your model methods remain the same
    findById: async (orderId) => {
        const orderQuery = `
            SELECT o.*, u.user_id, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            WHERE o.order_id = ?
        `;
        const [orderRows] = await db.query(orderQuery, [orderId]);
        const order = orderRows[0];

        if (!order) return null;

        // Fetch Items
        const itemsQuery = `SELECT * FROM order_items WHERE order_id = ?`;
        const [items] = await db.query(itemsQuery, [orderId]);
        order.items = items;

        // Fetch Address
        const addressQuery = `SELECT * FROM order_addresses WHERE order_id = ?`;
        const [addressRows] = await db.query(addressQuery, [orderId]);
        order.delivery_address = addressRows[0];

        // Fetch History
        const historyQuery = `SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC`;
        const [history] = await db.query(historyQuery, [orderId]);
        order.status_timeline = history;

        return order;
    },

    create: async (orderData, connection) => {
        const { order_id, order_number, user_id, subtotal, discount_amount, coupon_id, coupon_code, shipping_charge, total_amount, payment_method } = orderData;
        const query = `
            INSERT INTO orders (
                order_id, order_number, user_id, subtotal, discount_amount,
                coupon_id, coupon_code, shipping_charge, total_amount, payment_method
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [
            order_id,
            order_number,
            user_id,
            subtotal,
            discount_amount,
            coupon_id,
            coupon_code,
            shipping_charge,
            total_amount,
            payment_method
        ]);
        return result.affectedRows > 0;
    },

    addItem: async (itemData, connection) => {
        const { order_item_id, order_id, product_id, variant_id, product_name, variant_sku, attributes_json, quantity, price } = itemData;
        const query = `
            INSERT INTO order_items (order_item_id, order_id, product_id, variant_id, product_name, variant_sku, attributes_json, quantity, price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [order_item_id, order_id, product_id, variant_id, product_name, variant_sku, JSON.stringify(attributes_json), quantity, price]);
        return result.affectedRows > 0;
    },

    addAddress: async (addressData, connection) => {
        const { order_address_id, order_id, name, phone, email, address_line1, address_line2, city, state, zip_code, country } = addressData;
        const query = `
            INSERT INTO order_addresses (order_address_id, order_id, name, phone, email, address_line1, address_line2, city, state, zip_code, country)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [order_address_id, order_id, name, phone, email, address_line1, address_line2, city, state, zip_code, country]);
        return result.affectedRows > 0;
    },

    addHistory: async (historyData, connection) => {
        const { history_id, order_id, status, comment } = historyData;
        const query = `INSERT INTO order_status_history (history_id, order_id, status, comment) VALUES (?, ?, ?, ?)`;
        const executor = connection || db;
        const [result] = await executor.query(query, [history_id, order_id, status, comment]);
        return result.affectedRows > 0;
    },

    updateStatus: async (orderId, status, comment, connection = null) => {
        const executor = connection || await db.getConnection();
        const shouldManageTransaction = !connection;

        try {
            if (shouldManageTransaction) await executor.beginTransaction();
            
            const query = `UPDATE orders SET status = ? WHERE order_id = ?`;
            await executor.query(query, [status, orderId]);

            const historyId = uuidv4();
            await Order.addHistory({ history_id: historyId, order_id: orderId, status, comment }, executor);

            if (shouldManageTransaction) await executor.commit();
            return true;
        } catch (error) {
            if (shouldManageTransaction) await executor.rollback();
            throw error;
        } finally {
            if (shouldManageTransaction) executor.release();
        }
    },

    updatePaymentStatus: async (orderId, paymentStatus, transactionId) => {
        const query = `UPDATE orders SET payment_status = ?, transaction_id = COALESCE(?, transaction_id) WHERE order_id = ?`;
        const [result] = await db.query(query, [paymentStatus, transactionId, orderId]);
        return result.affectedRows > 0;
    }
};

module.exports = Order;
