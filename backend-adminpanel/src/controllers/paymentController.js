const PaymentService = require('../services/paymentService');

const paymentController = {
    createOrder: async (req, res, next) => {
        try {
            const { order_id, amount } = req.body;

            if (!order_id || !amount) {
                const error = new Error('order_id and amount are required');
                error.statusCode = 400;
                throw error;
            }

            const razorpayOrder = await PaymentService.createRazorpayOrder(order_id, amount);
            
            res.status(201).json({
                success: true,
                razorpay_order_id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency
            });
        } catch (error) {
            next(error);
        }
    },

    verifyPayment: async (req, res, next) => {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                const error = new Error('Missing payment verification details');
                error.statusCode = 400;
                throw error;
            }

            const result = await PaymentService.verifyPayment(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            );

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    getAllPayments: async (req, res, next) => {
        try {
            const { limit = 10, offset = 0 } = req.query;
            const data = await PaymentService.getAllPayments({ limit, offset });
            
            res.status(200).json({
                success: true,
                data: data.payments,
                total: data.total
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = paymentController;
