const analyticsService = require('../services/analyticsService');

const analyticsController = {
    getSummary: async (req, res, next) => {
        try {
            const summary = await analyticsService.getSummaryStats(req.query);
            const insights = await analyticsService.getSmartInsights();
            res.status(200).json({
                success: true,
                data: {
                    ...summary,
                    insights
                }
            });
        } catch (error) {
            next(error);
        }
    },

    getTrends: async (req, res, next) => {
        try {
            const trends = await analyticsService.getTrendData(req.query);
            res.status(200).json({
                success: true,
                data: trends
            });
        } catch (error) {
            next(error);
        }
    },

    getProducts: async (req, res, next) => {
        try {
            const data = await analyticsService.getTopProducts(req.query);
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    getCustomers: async (req, res, next) => {
        try {
            const data = await analyticsService.getCustomerAnalytics(req.query);
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    getInventory: async (req, res, next) => {
        try {
            const lowStockSql = `
                SELECT p.name, inv.quantity, inv.low_stock_threshold
                FROM inventory_levels inv
                JOIN product_variants pv ON inv.variant_id = pv.variant_id
                JOIN products p ON pv.product_id = p.product_id
                WHERE inv.quantity <= inv.low_stock_threshold
                LIMIT 10
            `;
            const [lowStock] = await require('../config/database').query(lowStockSql);

            res.status(200).json({
                success: true,
                data: {
                    lowStock
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = analyticsController;
