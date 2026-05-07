const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Order = {
    create: async (orderData, items) => {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const orderId = uuidv4();
            const { 
                user_id, address_id, subtotal, discount, 
                delivery_fee, total_amount, payment_method, shipping_address, coupon_id
            } = orderData;

            // 1. Insert Order
            const orderNumber = `ORD${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
            const orderSql = `
                INSERT INTO orders (
                    order_id, order_number, user_id, address_id, subtotal, discount, 
                    delivery_fee, total_amount, payment_method, shipping_address, coupon_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await connection.query(orderSql, [
                orderId, orderNumber, user_id, address_id, subtotal, discount, 
                delivery_fee, total_amount, payment_method, JSON.stringify(shipping_address), coupon_id || null
            ]);

            // 2. Insert Order Items
            for (const item of items) {
                const orderItemId = uuidv4();
                const itemSql = `
                    INSERT INTO order_items (
                        order_item_id, order_id, product_id, variant_id, 
                        product_name, variant_name, variant_sku, quantity, price, image_url
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                await connection.query(itemSql, [
                    orderItemId, orderId, item.product_id, 
                    item.variant_id || null, item.product_name, 
                    item.variant_name || null, item.variant_sku || null, 
                    item.quantity, item.price, item.image_url || null
                ]);

                // 3. Update Inventory (Deduct Stock)
                if (item.variant_id) {
                    await connection.query(
                        'UPDATE inventory_levels SET quantity = quantity - ? WHERE variant_id = ?',
                        [item.quantity, item.variant_id]
                    );
                } else {
                    // Fallback for base products if they have inventory entries directly
                    await connection.query(
                        'UPDATE inventory_levels SET quantity = quantity - ? WHERE product_id = ? AND variant_id IS NULL',
                        [item.quantity, item.product_id]
                    );
                }
            }

            await connection.commit();
            
            // 4. Initial Timeline Event
            const timelineId = uuidv4();
            await db.query(
                'INSERT INTO order_timeline (timeline_id, order_id, status, message) VALUES (?, ?, ?, ?)',
                [timelineId, orderId, 'pending', 'Order placed successfully']
            );

            return { order_id: orderId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    findById: async (orderId) => {
        const [orders] = await db.query(`
            SELECT o.*, 
            (SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'product_id', oi.product_id,
                    'variant_id', oi.variant_id,
                    'quantity', oi.quantity,
                    'price', oi.price,
                    'name', oi.product_name,
                    'variant_name', oi.variant_name,
                    'image_url', oi.image_url
                )
            ) FROM order_items oi 
            WHERE oi.order_id = o.order_id) as items,
            (SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'status', ot.status,
                    'message', ot.message,
                    'created_at', ot.created_at
                )
            ) FROM order_timeline ot 
            WHERE ot.order_id = o.order_id ORDER BY ot.created_at ASC) as timeline
            FROM orders o WHERE o.order_id = ?
        `, [orderId]);
        
        const order = orders[0];
        if (order) {
            if (typeof order.items === 'string') order.items = JSON.parse(order.items);
            if (typeof order.timeline === 'string') order.timeline = JSON.parse(order.timeline);
            if (typeof order.shipping_address === 'string') order.shipping_address = JSON.parse(order.shipping_address);
        }
        
        return order;
    },

    updateStatus: async (orderId, status, paymentStatus) => {
        const sql = 'UPDATE orders SET status = ?, payment_status = ? WHERE order_id = ?';
        await db.query(sql, [status, paymentStatus, orderId]);
    },

    findAllByUserId: async (userId, page = 1, limit = 10) => {
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `SELECT o.*, 
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', oi.product_name))
             FROM order_items oi 
             WHERE oi.order_id = o.order_id LIMIT 3) as items_preview
             FROM orders o WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), parseInt(offset)]
        );
        return rows;
    },

    cancelOrder: async (orderId, userId) => {
        const [result] = await db.query(
            `UPDATE orders SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP 
             WHERE order_id = ? AND user_id = ? AND status IN ('pending', 'paid', 'processing')`,
            [orderId, userId]
        );
        return result.affectedRows > 0;
    },

    adminUpdateStatus: async (orderId, data) => {
        const { status, tracking_id, courier_name, estimated_delivery_date, message } = data;
        const sql = `
            UPDATE orders SET 
                status = ?, 
                tracking_id = ?, 
                courier_name = ?, 
                estimated_delivery_date = ? 
            WHERE order_id = ?
        `;
        await db.query(sql, [
            status, 
            tracking_id || null, 
            courier_name || null, 
            estimated_delivery_date || null, 
            orderId
        ]);

        // Add timeline event
        const timelineId = uuidv4();
        await db.query(
            'INSERT INTO order_timeline (timeline_id, order_id, status, message) VALUES (?, ?, ?, ?)',
            [timelineId, orderId, status, message || `Order status updated to ${status}`]
        );
    },

    updateShipping: async (orderId, shippingData) => {
        const { tracking_id, courier_name, estimated_delivery_date } = shippingData;
        const sql = `
            UPDATE orders SET 
                tracking_id = ?, 
                courier_name = ?, 
                estimated_delivery_date = ?,
                status = 'shipped'
            WHERE order_id = ?
        `;
        await db.query(sql, [tracking_id, courier_name, estimated_delivery_date, orderId]);

        // Add timeline event
        const timelineId = uuidv4();
        await db.query(
            'INSERT INTO order_timeline (timeline_id, order_id, status, message) VALUES (?, ?, ?, ?)',
            [timelineId, orderId, 'shipped', `Order shipped via ${courier_name}. Tracking ID: ${tracking_id}`]
        );

        // CREATE SHIPMENT RECORD (Sync with Shipping Module)
        try {
            const Shipment = require('./shipmentModel');
            // Check if shipment already exists
            const existing = await Shipment.findByOrderId(orderId);
            if (existing.length === 0) {
                console.log(`📦 Creating shipment record for Order: ${orderId}`);
                await Shipment.create({
                    order_id: orderId,
                    courier_name: courier_name,
                    tracking_number: tracking_id
                });
                
                // Automatically advance to 'Shipped' status in shipment model
                const newShipment = await Shipment.findByOrderId(orderId);
                if (newShipment.length > 0) {
                    await Shipment.updateStatus(newShipment[0].shipment_id, 'Shipped', { 
                        location: 'Warehouse', 
                        comment: 'Order marked as shipped from order management.' 
                    });
                }
            }
        } catch (err) {
            console.error('❌ Failed to create shipment record:', err.message);
            // Don't fail the whole request if shipment record creation fails, 
            // but log it for debugging.
        }
    }
};

module.exports = Order;
