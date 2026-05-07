const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/orderModel');
const Payment = require('../models/paymentModel');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const paymentController = {
    initiatePayment: async (req, res, next) => {
        try {
            const { order_id } = req.body;
            const order = await Order.findById(order_id);

            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Razorpay options
            const options = {
                amount: Math.round(order.total_amount * 100), // amount in the smallest currency unit (paise)
                currency: "INR",
                receipt: order.order_number
            };

            const rzpOrder = await razorpay.orders.create(options);

            // Save to payments table
            await Payment.create({
                order_id: order_id,
                gateway_order_id: rzpOrder.id,
                amount: order.total_amount,
                status: 'pending'
            });

            res.status(200).json({
                success: true,
                data: {
                    order_id: order_id,
                    razorpay_order_id: rzpOrder.id,
                    amount: options.amount,
                    currency: options.currency,
                    key_id: process.env.RAZORPAY_KEY_ID
                }
            });
        } catch (error) {
            next(error);
        }
    },

    verifyPayment: async (req, res, next) => {
        try {
            const { 
                razorpay_order_id, 
                razorpay_payment_id, 
                razorpay_signature 
            } = req.body;

            // 1. Verify Signature
            const sign = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSign = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(sign.toString())
                .digest("hex");

            const isAuthentic = expectedSign === razorpay_signature;

            if (isAuthentic) {
                // 2. Update Payment Status
                await Payment.updateByGatewayOrderId(razorpay_order_id, {
                    gateway_payment_id: razorpay_payment_id,
                    status: 'success'
                });

                // 3. Update Order Status
                const payment = await Payment.findByGatewayOrderId(razorpay_order_id);
                if (payment) {
                    await Order.updateStatus(payment.order_id, 'paid', 'success');
                    
                    // 4. Clear Cart (FINAL STEP)
                    const cartService = require('../services/cartService');
                    const order = await Order.findById(payment.order_id);
                    if (order && order.user_id) {
                        console.log(`🧹 Payment verified. Clearing cart for user: ${order.user_id}`);
                        await cartService.clearCart(order.user_id, null);
                    }
                }

                res.status(200).json({
                    success: true,
                    message: "Payment verified successfully"
                });
            } else {
                // Update failed status
                await Payment.updateByGatewayOrderId(razorpay_order_id, {
                    status: 'failed'
                });
                
                res.status(400).json({
                    success: false,
                    message: "Invalid payment signature"
                });
            }
        } catch (error) {
            next(error);
        }
    }
};

module.exports = paymentController;
