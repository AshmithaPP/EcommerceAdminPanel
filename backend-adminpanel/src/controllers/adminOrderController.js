const Order = require('../models/orderModel');
const db = require('../config/database');

const adminOrderController = {
    getAllOrders: async (req, res, next) => {
        try {
            const { status, search, page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            let sql = `
                SELECT o.*, u.name as customer_name, u.email as customer_email,
                CASE 
                    WHEN LOWER(o.payment_method) = 'cod' THEN 'N/A (Cash on Delivery)'
                    ELSE COALESCE(o.transaction_id, p.gateway_payment_id)
                END as transaction_id
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.user_id
                LEFT JOIN payments p ON o.order_id = p.order_id AND p.status = 'success'
                WHERE 1=1
            `;
            const params = [];

            if (status && status !== 'All') {
                sql += ' AND o.status = ?';
                params.push(status.toLowerCase());
            }

            if (search) {
                sql += ' AND (o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            // Get total count for pagination with same filters
            let countSql = `
                SELECT COUNT(*) as total 
                FROM orders o 
                LEFT JOIN users u ON o.user_id = u.user_id 
                WHERE 1=1
            `;
            const countParams = [];
            if (status && status !== 'All') {
                countSql += ' AND o.status = ?';
                countParams.push(status.toLowerCase());
            }
            if (search) {
                countSql += ' AND (o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
                countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            const [countRows] = await db.query(countSql, countParams);

            sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [orders] = await db.query(sql, params);
            
            res.status(200).json({
                success: true,
                orders,
                pagination: {
                    total: countRows[0].total,
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    },

    getOrderDetails: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            
            // JOIN with payments to get transaction_id if missing in orders table (legacy/fallback)
            const [orderRows] = await db.query(`
                SELECT o.*, 
                CASE 
                    WHEN LOWER(o.payment_method) = 'cod' THEN 'N/A (Cash on Delivery)'
                    ELSE COALESCE(o.transaction_id, p.gateway_payment_id)
                END as transaction_id
                FROM orders o
                LEFT JOIN payments p ON o.order_id = p.order_id AND p.status = 'success'
                WHERE o.order_id = ?
            `, [order_id]);
            
            const order = orderRows[0];
            
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Fetch order items and timeline using the model helper (since it parses JSON etc)
            const fullOrder = await Order.findById(order_id);
            order.items = fullOrder.items;
            order.timeline = fullOrder.timeline;

            // Fetch User details for customer section
            const [userRows] = await db.query('SELECT name, email, phone FROM users WHERE user_id = ?', [order.user_id]);
            const customer = userRows[0] || { name: 'Guest', email: '', phone: '' };

            res.status(200).json({ 
                success: true, 
                data: {
                    ...order,
                    customer
                } 
            });
        } catch (error) {
            next(error);
        }
    },

    updateOrderStatus: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            const { status, message } = req.body;

            const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }

            const currentOrder = await Order.findById(order_id);
            if (!currentOrder) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Prevention: Cannot cancel after shipped
            if (status === 'cancelled' && ['shipped', 'delivered'].includes(currentOrder.status)) {
                return res.status(400).json({ success: false, message: 'Cannot cancel order after it has been shipped' });
            }

            // Prevention: Cannot mark as shipped without a Tracking ID
            if (status === 'shipped' && !currentOrder.tracking_id) {
                return res.status(400).json({ success: false, message: 'Tracking ID is required before marking order as Shipped' });
            }

            await Order.adminUpdateStatus(order_id, {
                status,
                tracking_id: currentOrder.tracking_id,
                courier_name: currentOrder.courier_name,
                estimated_delivery_date: currentOrder.estimated_delivery_date,
                message
            });

            res.status(200).json({
                success: true,
                message: `Order status updated to ${status}`
            });
        } catch (error) {
            next(error);
        }
    },

    updateShippingDetails: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            const { tracking_id, courier_name, estimated_delivery_date } = req.body;

            if (!tracking_id || !courier_name) {
                return res.status(400).json({ success: false, message: 'Tracking ID and Courier Name are required' });
            }

            await Order.updateShipping(order_id, {
                tracking_id,
                courier_name,
                estimated_delivery_date
            });

            res.status(200).json({
                success: true,
                message: 'Shipping details updated and order marked as SHIPPED'
            });
        } catch (error) {
            next(error);
        }
    },

    getShipmentDetails: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            const order = await Order.findById(order_id);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
            res.status(200).json({
                success: true,
                data: {
                    courier_name: order.courier_name || '',
                    tracking_id: order.tracking_id || '',
                    tracking_url: order.tracking_url || 'https://www.stcourier.com/track/shipment',
                    shipment_status: order.shipment_status || 'Pending',
                    shipped_at: order.shipped_at || null,
                    estimated_delivery_date: order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toISOString().split('T')[0] : ''
                }
            });
        } catch (error) {
            next(error);
        }
    },

    updateShipmentDetails: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            const { courier_name, tracking_id, tracking_url, shipment_status, estimated_delivery_date } = req.body;

            // Manual Validation:
            const statusLower = shipment_status?.toLowerCase();
            if (statusLower === 'shipped' && !tracking_id) {
                return res.status(400).json({ success: false, message: 'Tracking ID is required when status is Shipped' });
            }

            if (statusLower !== 'pending' && (!courier_name || !tracking_id)) {
                return res.status(400).json({ success: false, message: 'Courier Name and Tracking ID are required' });
            }

            await Order.updateShipment(order_id, {
                courier_name,
                tracking_id,
                tracking_url,
                shipment_status,
                estimated_delivery_date
            });

            res.status(200).json({
                success: true,
                message: `Shipment details updated and status marked as ${shipment_status}`
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = adminOrderController;
