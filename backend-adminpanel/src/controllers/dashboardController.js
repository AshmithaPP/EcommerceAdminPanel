const dashboardService = require('../services/dashboardService');

const dashboardController = {
    getSummary: async (req, res, next) => {
        try {
            const summary = await dashboardService.getSummary();
            res.status(200).json({
                success: true,
                data: summary
            });
        } catch (error) {
            next(error);
        }
    },

    getSalesTrend: async (req, res, next) => {
        try {
            const trend = await dashboardService.getSalesTrend();
            res.status(200).json({
                success: true,
                data: trend
            });
        } catch (error) {
            next(error);
        }
    },

    getTopProducts: async (req, res, next) => {
        try {
            const limit = req.query.limit || 5;
            const topProducts = await dashboardService.getTopProducts(limit);
            res.status(200).json({
                success: true,
                data: topProducts
            });
        } catch (error) {
            next(error);
        }
    },

    getAlerts: async (req, res, next) => {
        try {
            const alerts = await dashboardService.getAlerts();
            res.status(200).json({
                success: true,
                data: alerts
            });
        } catch (error) {
            next(error);
        }
    },

    getRecentOrders: async (req, res, next) => {
        try {
            const recentOrders = await dashboardService.getRecentOrders();
            res.status(200).json({
                success: true,
                data: recentOrders
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = dashboardController;
