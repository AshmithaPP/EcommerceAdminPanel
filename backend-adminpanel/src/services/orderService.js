const Order = require('../models/orderModel');
const db = require('../config/database');
const couponService = require('./couponService');
const inventoryService = require('./inventoryService');
const { v4: uuidv4 } = require('uuid');

const orderService = {
    listOrders: async (params) => {
        const { search, status, payment_status, startDate, endDate, page = 1, limit = 10 } = params;
        const offset = (page - 1) * limit;

        return await Order.findAll({
            search,
            status,
            payment_status,
            startDate,
            endDate,
            limit,
            offset
        });
    },

    getOrderDetails: async (orderId) => {
        const order = await Order.findById(orderId);
        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }
        return order;
    },

    updateStatus: async (orderId, statusData) => {
        const { status, comment } = statusData;

        // Centralized logic for stock restoration on cancellation
        const order = await Order.findById(orderId);
        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Update Order Status in Model
            const result = await Order.updateStatus(orderId, status, comment, connection);
            if (!result) {
                throw new Error('Failed to update order status');
            }

            // 2. Cross-Model Logic: Restore stock if cancelled
            // Assuming status string for cancelled is "Cancelled" or "CANCELLED"
            const isCancelling = (status.toUpperCase() === 'CANCELLED' && order.status.toUpperCase() !== 'CANCELLED');
            
            if (isCancelling) {
                const items = order.items.map(item => ({
                    variant_id: item.variant_id,
                    quantity: item.quantity
                }));
                await inventoryService.restoreStockForOrder(items, orderId, connection);
            }

            await connection.commit();
            return { success: true, message: `Status updated to ${status}` };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    updatePaymentStatus: async (orderId, paymentData) => {
        const { payment_status, transaction_id } = paymentData;
        const result = await Order.updatePaymentStatus(orderId, payment_status, transaction_id);
        if (!result) {
            const error = new Error('Failed to update payment status');
            error.statusCode = 400;
            throw error;
        }
        return { success: true, message: `Payment status updated to ${payment_status}` };
    },

    // Technical Helper for Order Creation (for testing/future use)
    createOrder: async (orderData) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const orderId = uuidv4();
            const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

            const items = orderData.items || [];
            const subtotal = items.reduce((sum, item) => {
                const price = parseFloat(item.price) || 0;
                const qty = parseInt(item.quantity, 10) || 0;
                return sum + price * qty;
            }, 0);

            let discountAmount = 0;
            let couponId = null;
            let couponCode = null;

            if (orderData.coupon_code) {
                const couponResult = await couponService.applyCouponOnOrder(orderData.coupon_code, orderData.user_id, subtotal, connection);
                discountAmount = couponResult.discount_amount;
                couponId = couponResult.coupon_id;
                couponCode = couponResult.code;
            }

            const shippingCharge = parseFloat(orderData.shipping_charge) || 0;
            const totalAmount = parseFloat((subtotal - discountAmount + shippingCharge).toFixed(2));

            // 1. Create Order record
            await Order.create({
                order_id: orderId,
                order_number: orderNumber,
                user_id: orderData.user_id,
                subtotal,
                discount_amount: discountAmount,
                coupon_id: couponId,
                coupon_code: couponCode,
                shipping_charge: shippingCharge,
                total_amount: totalAmount,
                payment_method: orderData.payment_method
            }, connection);

            // 2. Add Address Snapshot
            await Order.addAddress({
                order_address_id: uuidv4(),
                order_id: orderId,
                ...orderData.address
            }, connection);

            // 3. Add Items
            for (const item of items) {
                await Order.addItem({
                    order_item_id: uuidv4(),
                    order_id: orderId,
                    ...item
                }, connection);
            }

            // Reduce Stock immediately for the order (Option A)
            await inventoryService.reduceStockForOrder(items.map(item => ({
                variant_id: item.variant_id,
                quantity: item.quantity
            })), orderId, connection);

            if (couponId && discountAmount > 0) {
                await require('./couponService').recordCouponUsage(couponId, orderData.user_id, orderId, discountAmount, connection);
            }

            // 4. Initial History
            await Order.addHistory({
                history_id: uuidv4(),
                order_id: orderId,
                status: 'Pending',
                comment: 'Order placed successfully'
            }, connection);

            await connection.commit();
            return { order_id: orderId, order_number: orderNumber, subtotal, discount_amount: discountAmount, total_amount: totalAmount };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = orderService;
