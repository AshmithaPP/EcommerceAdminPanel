const dashboardService = require('../services/dashboardService');

const dashboardController = {
    getOverview: async (req, res, next) => {
        try {
            const data = await dashboardService.getOverview();
            res.status(200).json({ success: true, ...data });
        } catch (error) {
            next(error);
        }
    },

    getSalesTrend: async (req, res, next) => {
        try {
            const { range } = req.query;
            const data = await dashboardService.getSalesTrend(range);
            res.status(200).json({ success: true, ...data });
        } catch (error) {
            next(error);
        }
    },

    getTopProducts: async (req, res, next) => {
        try {
            const { limit } = req.query;
            const data = await dashboardService.getTopProducts(limit);
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    getRevenueBreakdown: async (req, res, next) => {
        try {
            const data = await dashboardService.getRevenueBreakdown();
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    getTopCategories: async (req, res, next) => {
        try {
            const data = await dashboardService.getTopCategories();
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    getCustomerInsights: async (req, res, next) => {
        try {
            const data = await dashboardService.getCustomerInsights();
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    getPaymentAnalytics: async (req, res, next) => {
        try {
            const data = await dashboardService.getPaymentAnalytics();
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    getInventoryHealth: async (req, res, next) => {
        try {
            const data = await dashboardService.getInventoryHealth();
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = dashboardController;
