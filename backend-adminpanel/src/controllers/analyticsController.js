const analyticsService = require('../services/analyticsService');

const analyticsController = {
    getSummary: async (req, res, next) => {
        try {
            const summary = await analyticsService.getSummaryStats();
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
            const { period = 30 } = req.query;
            const trends = await analyticsService.getTrendData(period);
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
            // Re-using some dashboard logic or adding new ones
            const sql = `
                SELECT 
                    oi.product_name as name,
                    SUM(oi.quantity) as unitsSold,
                    SUM(oi.quantity * oi.price) as revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                WHERE o.payment_status = 'Paid'
                GROUP BY oi.product_id, oi.product_name
                ORDER BY unitsSold DESC
                LIMIT 10
            `;
            const [topProducts] = await require('../config/database').query(sql);

            // Category Breakdown
            const categorySql = `
                SELECT c.name as category, SUM(oi.quantity * oi.price) as revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.product_id
                JOIN sub_categories sc ON p.sub_category_id = sc.sub_category_id
                JOIN categories c ON sc.category_id = c.category_id
                JOIN orders o ON oi.order_id = o.order_id
                WHERE o.payment_status = 'Paid'
                GROUP BY c.name
            `;
            const [categories] = await require('../config/database').query(categorySql);

            res.status(200).json({
                success: true,
                data: {
                    topProducts,
                    categories
                }
            });
        } catch (error) {
            next(error);
        }
    },

    getCustomers: async (req, res, next) => {
        try {
            const geography = await analyticsService.getSalesByGeography();
            
            const leaderboardSql = `
                SELECT u.name, u.email, COUNT(o.order_id) as totalOrders, SUM(o.total_amount) as totalSpent
                FROM users u
                JOIN orders o ON u.user_id = o.user_id
                WHERE o.payment_status = 'Paid'
                GROUP BY u.user_id
                ORDER BY totalSpent DESC
                LIMIT 10
            `;
            const [leaderboard] = await require('../config/database').query(leaderboardSql);

            res.status(200).json({
                success: true,
                data: {
                    geography,
                    leaderboard
                }
            });
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
