const couponService = require('../services/couponService');

const couponController = {
    createCoupon: async (req, res, next) => {
        try {
            const result = await couponService.createCoupon(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },

    listCoupons: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const search = req.query.search || null;
            const result = await couponService.listCoupons(page, limit, search);
            res.status(200).json({ success: true, data: result.coupons, pagination: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
        } catch (error) {
            next(error);
        }
    },

    updateCoupon: async (req, res, next) => {
        try {
            const result = await couponService.updateCoupon(req.params.couponId, req.body);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },

    deleteCoupon: async (req, res, next) => {
        try {
            const result = await couponService.deleteCoupon(req.params.couponId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    validateCoupon: async (req, res, next) => {
        try {
            const { code, orderAmount } = req.body;
            const result = await couponService.validateCoupon(code, req.user.user_id, parseFloat(orderAmount));
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },

    getCouponUsageHistory: async (req, res, next) => {
        try {
            const result = await couponService.getCouponUsageHistory(req.params.couponId);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = couponController;
