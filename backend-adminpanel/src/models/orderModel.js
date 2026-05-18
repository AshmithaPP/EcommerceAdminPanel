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
                delivery_fee, total_amount, payment_method, shipping_address, coupon_id,
                gst_rate, gst_amount, cgst_amount, sgst_amount, igst_amount,
                amount_without_gst, amount_with_gst, shipping_zone,
                status, payment_status,
                guest_id, guest_name, guest_phone, guest_email
            } = orderData;

            // 1. Insert Order
            const orderNumber = `ORD${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
            const orderSql = `
                INSERT INTO orders (
                    order_id, order_number, user_id, guest_id, guest_name, guest_phone, guest_email,
                    address_id, subtotal, discount, 
                    delivery_fee, shipping_zone, total_amount, payment_method, shipping_address, coupon_id,
                    gst_rate, gst_amount, cgst_amount, sgst_amount, igst_amount,
                    amount_without_gst, amount_with_gst, status, payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await connection.query(orderSql, [
                orderId, orderNumber, user_id || null, guest_id || null, guest_name || null, guest_phone || null, guest_email || null,
                address_id, subtotal, discount,
                delivery_fee, shipping_zone || null, total_amount, payment_method, JSON.stringify(shipping_address), coupon_id || null,
                gst_rate || 0, gst_amount || 0, cgst_amount || 0, sgst_amount || 0, igst_amount || 0,
                amount_without_gst || 0, amount_with_gst || 0,
                status || 'pending', payment_status || 'pending'
            ]);

            // 2. Insert Order Items
            const Inventory = require('./inventoryModel');
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

            }
            // 3. Inventory update removed from here. 
            // Stock will now be deducted only after successful payment confirmation.

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
            let timeline = [];
            if (typeof order.timeline === 'string') {
                timeline = JSON.parse(order.timeline);
            } else if (Array.isArray(order.timeline)) {
                timeline = order.timeline;
            }
            
            // Virtual Timeline Correction: Ensure current status is reflected in timeline if missing
            const hasStatusInTimeline = timeline.some(t => t.status?.toLowerCase() === order.status?.toLowerCase());
            if (!hasStatusInTimeline && order.status !== 'pending') {
                timeline.push({
                    status: order.status,
                    message: `Order status moved to ${order.status}`,
                    created_at: order.updated_at || order.created_at,
                    is_virtual: true
                });
            }
            order.timeline = timeline;

            if (typeof order.shipping_address === 'string') order.shipping_address = JSON.parse(order.shipping_address);
        }

        return order;
    },

    updateStatus: async (orderId, status, paymentStatus, transactionId = null, gateway = 'razorpay', connection = null) => {
        const sql = 'UPDATE orders SET status = ?, payment_status = ?, transaction_id = ?, payment_gateway = ? WHERE order_id = ?';
        const params = [status, paymentStatus, transactionId, gateway, orderId];
        const conn = connection || db;
        
        await conn.query(sql, params);

        // Add timeline event
        const timelineId = uuidv4();
        await conn.query(
            'INSERT INTO order_timeline (timeline_id, order_id, status, message) VALUES (?, ?, ?, ?)',
            [timelineId, orderId, status, `Payment confirmed. Status updated to ${status}.`]
        );
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

    cancelOrder: async (order_id, userId) => {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Check if order exists and is cancellable
            const [orders] = await connection.query(
                'SELECT order_number, status FROM orders WHERE order_id = ? AND user_id = ?',
                [order_id, userId]
            );

            if (orders.length === 0) return false;
            const order = orders[0];

            if (!['pending', 'paid', 'processing'].includes(order.status)) {
                await connection.rollback();
                return false;
            }

            // 2. Fetch items to restore stock
            const [items] = await connection.query(
                'SELECT variant_id, product_id, quantity FROM order_items WHERE order_id = ?',
                [order_id]
            );

            // 3. Update Order Status
            await connection.query(
                "UPDATE orders SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE order_id = ?",
                [order_id]
            );

            // 4. Restore Inventory & Log History
            const Inventory = require('./inventoryModel');
            for (const item of items) {
                if (item.variant_id) {
                    await Inventory.adjustStock(
                        item.variant_id,
                        item.quantity,
                        'ORDER_CANCELLED',
                        order.order_number,
                        'Order cancelled by customer',
                        connection
                    );
                } else {
                    // Fallback for base products
                    await connection.query(
                        'UPDATE inventory_levels SET quantity = quantity + ? WHERE product_id = ? AND variant_id IS NULL',
                        [item.quantity, item.product_id]
                    );
                }
            }

            // 5. Add timeline event
            const timelineId = uuidv4();
            await connection.query(
                'INSERT INTO order_timeline (timeline_id, order_id, status, message) VALUES (?, ?, ?, ?)',
                [timelineId, order_id, 'cancelled', 'Order cancelled by customer']
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    adminUpdateStatus: async (orderId, data) => {
        const { status, tracking_id, courier_name, estimated_delivery_date, message } = data;
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Fetch current details
            const [orders] = await connection.query('SELECT status, order_number, payment_method FROM orders WHERE order_id = ?', [orderId]);
            if (orders.length === 0) throw new Error('Order not found');
            const oldStatus = orders[0].status;
            const orderNumber = orders[0].order_number;
            const paymentMethod = orders[0].payment_method;

            // 2. Update Order Record
            const sql = `
                UPDATE orders SET 
                    status = ?, 
                    tracking_id = ?, 
                    courier_name = ?, 
                    estimated_delivery_date = ? 
                WHERE order_id = ?
            `;
            await connection.query(sql, [
                status,
                tracking_id || null,
                courier_name || null,
                estimated_delivery_date || null,
                orderId
            ]);

            // Special Case: COD order delivered should mark payment as Paid
            if (status === 'delivered' && paymentMethod?.toUpperCase() === 'COD') {
                await connection.query('UPDATE orders SET payment_status = "Paid" WHERE order_id = ?', [orderId]);
                
                // Add an extra timeline event for the payment confirmation
                const payTimelineId = uuidv4();
                await connection.query(
                    'INSERT INTO order_timeline (timeline_id, order_id, status, message) VALUES (?, ?, ?, ?)',
                    [payTimelineId, orderId, 'paid', 'Payment collected (Cash on Delivery)']
                );
            }

            // 3. Stock Restoration Logic (If moving to cancelled from a non-cancelled state)
            if (status === 'cancelled' && oldStatus !== 'cancelled') {
                const [items] = await connection.query('SELECT variant_id, product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
                const Inventory = require('./inventoryModel');
                for (const item of items) {
                    if (item.variant_id) {
                        await Inventory.adjustStock(
                            item.variant_id,
                            item.quantity,
                            'ORDER_CANCELLED',
                            orderNumber,
                            'Order cancelled by admin',
                            connection
                        );
                    } else {
                        await connection.query(
                            'UPDATE inventory_levels SET quantity = quantity + ? WHERE product_id = ? AND variant_id IS NULL',
                            [item.quantity, item.product_id]
                        );
                    }
                }
            }

            // 4. Add timeline event
            const timelineId = uuidv4();
            await connection.query(
                'INSERT INTO order_timeline (timeline_id, order_id, status, message) VALUES (?, ?, ?, ?)',
                [timelineId, orderId, status, message || `Order status updated to ${status}`]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
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
    },

    updateShipment: async (orderId, shipmentData) => {
        const { courier_name, tracking_id, tracking_url, shipment_status, estimated_delivery_date } = shipmentData;
        
        // Validation: tracking_id required when shipment_status = Shipped
        if (shipment_status?.toLowerCase() === 'shipped' && !tracking_id) {
            throw new Error('Tracking ID is required when status is Shipped');
        }

        // Prevent empty courier details when status is anything but Pending
        if (shipment_status?.toLowerCase() !== 'pending' && (!courier_name || !tracking_id)) {
            throw new Error('Courier Name and Tracking ID are required for status: ' + shipment_status);
        }

        // 1. Fetch current order to check shipped_at status
        const [orders] = await db.query('SELECT shipped_at, status FROM orders WHERE order_id = ?', [orderId]);
        if (orders.length === 0) throw new Error('Order not found');
        const currentShippedAt = orders[0].shipped_at;
        
        let shippedAtVal = currentShippedAt;
        if (shipment_status?.toLowerCase() === 'shipped' && !currentShippedAt) {
            shippedAtVal = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

        // Map shipment status to main order status
        let orderStatus = orders[0].status;
        const statusLower = shipment_status?.toLowerCase();
        if (statusLower === 'pending') orderStatus = 'pending';
        else if (statusLower === 'packed') orderStatus = 'processing';
        else if (statusLower === 'shipped') orderStatus = 'shipped';
        else if (statusLower === 'out for delivery') orderStatus = 'shipped';
        else if (statusLower === 'delivered') orderStatus = 'delivered';

        const sql = `
            UPDATE orders SET 
                courier_name = ?, 
                tracking_id = ?, 
                tracking_url = ?, 
                shipment_status = ?, 
                shipped_at = ?,
                status = ?,
                estimated_delivery_date = ?
            WHERE order_id = ?
        `;
        await db.query(sql, [
            courier_name || null,
            tracking_id || null,
            tracking_url || 'https://www.stcourier.com/track/shipment',
            shipment_status || 'Pending',
            shippedAtVal || null,
            orderStatus,
            estimated_delivery_date || null,
            orderId
        ]);

        // Add timeline event
        const timelineId = uuidv4();
        const timelineMsg = `Shipment status updated to: ${shipment_status}. Courier: ${courier_name || 'N/A'}, Tracking ID: ${tracking_id || 'N/A'}`;
        await db.query(
            'INSERT INTO order_timeline (timeline_id, order_id, status, message) VALUES (?, ?, ?, ?)',
            [timelineId, orderId, orderStatus, timelineMsg]
        );

        // Special Case: COD order delivered should mark payment as Paid
        if (statusLower === 'delivered') {
            const [orderCheck] = await db.query('SELECT payment_method FROM orders WHERE order_id = ?', [orderId]);
            if (orderCheck[0]?.payment_method?.toUpperCase() === 'COD') {
                await db.query('UPDATE orders SET payment_status = "Paid" WHERE order_id = ?', [orderId]);
                const payTimelineId = uuidv4();
                await db.query(
                    'INSERT INTO order_timeline (timeline_id, order_id, status, message) VALUES (?, ?, ?, ?)',
                    [payTimelineId, orderId, 'paid', 'Payment collected (Cash on Delivery)']
                );
            }
        }
    }
};

module.exports = Order;
