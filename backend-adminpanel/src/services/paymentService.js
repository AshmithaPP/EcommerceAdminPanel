const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/paymentModel');
const Order = require('../models/orderModel');
const inventoryService = require('./inventoryService');
const analyticsService = require('./analyticsService');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PaymentService = {
    createRazorpayOrder: async (orderId, amount) => {
        // Razorpay expects amount in paise (1 INR = 100 paise)
        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: orderId, // orderId (UUID) is 36 chars, fits in Razorpay's 40-char limit
        };

        try {
            const razorpayOrder = await razorpay.orders.create(options);
            
            // Store initial payment record
            await Payment.create({
                order_id: orderId,
                razorpay_order_id: razorpayOrder.id,
                amount: amount,
                currency: 'INR'
            });

            return razorpayOrder;
        } catch (error) {
            console.error('Razorpay Order Creation Error:', error);
            throw error;
        }
    },

    verifyPayment: async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpaySignature) {
            // Mark payment as failed in DB
            await Payment.updateStatus(razorpayOrderId, 'failed', razorpayPaymentId, razorpaySignature);
            throw new Error('Invalid payment signature');
        }

        // 1. Update Payment record to success
        await Payment.updateStatus(razorpayOrderId, 'success', razorpayPaymentId, razorpaySignature);

        // 2. Update related Order status
        const paymentRecord = await Payment.findByRazorpayOrderId(razorpayOrderId);
        if (paymentRecord) {
            await Order.updatePaymentStatus(paymentRecord.order_id, 'Paid', razorpayPaymentId);
            // Also update main status to 'Confirmed'
            await Order.updateStatus(paymentRecord.order_id, 'Confirmed', 'Payment received via Razorpay');

            // 3. Deduct stock permanently from inventory
            const orderDetails = await Order.findById(paymentRecord.order_id);
            if (orderDetails && orderDetails.items) {
                await inventoryService.completeOrderStockDeduction(
                    orderDetails.items.map(item => ({
                        variant_id: item.variant_id,
                        quantity: item.quantity
                    })),
                    paymentRecord.order_id
                );
            }

            // 4. Update Analytics daily_stats (Real-time update)
            const today = new Date().toISOString().split('T')[0];
            await analyticsService.updateDailyStats(today);
        }

        return { success: true, message: 'Payment verified successfully' };
    },

    getAllPayments: async (pagination) => {
        return await Payment.findAll(pagination);
    }
};

module.exports = PaymentService;
