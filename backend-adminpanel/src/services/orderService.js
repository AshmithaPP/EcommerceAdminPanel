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
        const { status = 'paid', payment_status, transaction_id } = paymentData;
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Order.updateStatus signature: (orderId, status, paymentStatus, transactionId, gateway)
            await Order.updateStatus(orderId, status, payment_status, transaction_id, 'razorpay', connection);

            // If payment is successful, deduct stock
            const successStatuses = ['Paid', 'Completed', 'COMPLETED', 'PAID', 'success', 'SUCCESS'];
            if (successStatuses.includes(payment_status)) {
                await orderService.deductStockForPayment(orderId, connection);
            }

            await connection.commit();
            return { success: true, message: `Payment status updated to ${payment_status}` };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Deducts stock for an order if it hasn't been deducted yet.
     * Used after successful payment.
     */
    deductStockForPayment: async (orderId, connection = null) => {
        const conn = connection || await db.getConnection();
        try {
            if (!connection) await conn.beginTransaction();

            // 1. Fetch order to check deduction flag
            const order = await Order.findById(orderId);
            if (!order) throw new Error('Order not found');

            // 2. Prevent double deduction
            if (order.is_stock_deducted) {
                console.log(`ℹ️ Stock already deducted for order ${orderId}`);
                if (!connection) await conn.commit();
                return true;
            }

            // 3. Deduct stock for all items
            const items = order.items.map(item => ({
                variant_id: item.variant_id,
                quantity: item.quantity
            }));

            await inventoryService.reduceStockForOrder(items, order.order_number, conn);

            // 4. Mark as deducted
            await conn.query('UPDATE orders SET is_stock_deducted = 1 WHERE order_id = ?', [orderId]);

            if (!connection) await conn.commit();
            return true;
        } catch (error) {
            if (!connection) await conn.rollback();
            console.error(`❌ Failed to deduct stock for order ${orderId}:`, error.message);
            throw error;
        } finally {
            if (!connection) conn.release();
        }
    },

    // Technical Helper for Order Creation (for testing/future use)
    createOrder: async (orderData) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const orderId = uuidv4();
            const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

            // 1. Calculate Financials
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

            // GST Calculations
            const Settings = require('../models/settingsModel');
            const settings = await Settings.getAll();
            const gstRate = parseFloat(settings.store_settings?.gst) || 0;
            
            const taxableValue = Math.max(0, subtotal - discountAmount);
            const gstAmount = parseFloat((taxableValue * (gstRate / 100)).toFixed(2));
            const amountWithoutGst = taxableValue;
            const amountWithGst = parseFloat((taxableValue + gstAmount).toFixed(2));

            // Breakdown logic (Simple state-based)
            const shippingState = orderData.address?.state?.toLowerCase() || '';
            const storeState = 'tamil nadu'; // Can be fetched from settings if needed
            
            let cgstAmount = 0;
            let sgstAmount = 0;
            let igstAmount = 0;

            if (shippingState === storeState) {
                cgstAmount = parseFloat((gstAmount / 2).toFixed(2));
                sgstAmount = parseFloat((gstAmount - cgstAmount).toFixed(2));
            } else {
                igstAmount = gstAmount;
            }

            // Shipping Calculations
            const ShippingZone = require('../models/shippingModel');
            const shippingResult = await ShippingZone.calculateCharge(orderData.address?.state, subtotal);
            const shippingCharge = shippingResult.shippingCharge;
            const shippingZoneName = shippingResult.zone;

            const totalAmount = parseFloat((amountWithGst + shippingCharge).toFixed(2));

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
                shipping_zone: shippingZoneName,
                total_amount: totalAmount,
                payment_method: orderData.payment_method,
                gst_rate: gstRate,
                gst_amount: gstAmount,
                cgst_amount: cgstAmount,
                sgst_amount: sgstAmount,
                igst_amount: igstAmount,
                amount_without_gst: amountWithoutGst,
                amount_with_gst: amountWithGst
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

            // Stock deduction removed from immediate order creation.
            // Will be triggered by updatePaymentStatus upon success.

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
