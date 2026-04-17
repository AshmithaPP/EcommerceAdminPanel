const orderService = require('../services/orderService');

const orderController = {
    listOrders: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await orderService.listOrders({ ...req.query, page, limit });
            
            res.status(200).json({
                success: true,
                data: result.orders,
                total: result.total,
                page,
                limit
            });
        } catch (error) {
            next(error);
        }
    },

    getOrderDetails: async (req, res, next) => {
        try {
            const result = await orderService.getOrderDetails(req.params.order_id);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    updateStatus: async (req, res, next) => {
        try {
            const result = await orderService.updateStatus(req.params.order_id, req.body);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    updatePaymentStatus: async (req, res, next) => {
        try {
            const result = await orderService.updatePaymentStatus(req.params.order_id, req.body);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Technical Endpoint: Manual Order Creation (Helpful for testing the details page)
    createOrder: async (req, res, next) => {
        try {
            const result = await orderService.createOrder(req.body);
            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = orderController;
