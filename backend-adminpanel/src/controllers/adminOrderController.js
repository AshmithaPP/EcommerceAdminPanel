const Order = require('../models/orderModel');
const db = require('../config/database');

const adminOrderController = {
    getAllOrders: async (req, res, next) => {
        try {
            const { status, page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            let sql = 'SELECT * FROM orders';
            const params = [];

            if (status) {
                sql += ' WHERE status = ?';
                params.push(status);
            }

            sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [orders] = await db.query(sql, params);
            
            // Total count for pagination
            const [countRows] = await db.query('SELECT COUNT(*) as total FROM orders');

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
            const order = await Order.findById(order_id);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

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
    }
};

module.exports = adminOrderController;
