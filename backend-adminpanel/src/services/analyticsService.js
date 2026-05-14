const db = require('../config/database');

const analyticsService = {
    /**
     * Helper to get date range SQL and params
     */
    _getDateFilter: (options, alias = 'o') => {
        const { range = '30days', startDate, endDate } = options;
        let start, end;
        
        if (startDate && endDate) {
            start = startDate;
            end = endDate;
        } else {
            end = 'CURDATE()';
            if (range === 'today') start = 'CURDATE()';
            else if (range === '7days') start = 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
            else if (range === '90days') start = 'DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
            else if (range === 'thisMonth') start = "DATE_FORMAT(CURDATE(), '%Y-%m-01')";
            else start = 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        }

        const startExpr = (startDate && endDate) ? '?' : start;
        const endExpr = (startDate && endDate) ? '?' : end;
        const params = (startDate && endDate) ? [start, end] : [];
        
        return {
            where: `${alias}.created_at BETWEEN ${startExpr} AND DATE_ADD(${endExpr}, INTERVAL 1 DAY)`,
            params
        };
    },

    /**
     * KPI Summary with range support.
     */
    getSummaryStats: async (options = {}) => {
        const filter = analyticsService._getDateFilter(options);
        const subFilter = analyticsService._getDateFilter(options, 'o2');
        
        const finalParams = [...subFilter.params, ...filter.params];
        
        const finalSql = `
            SELECT 
                COUNT(*) as orders,
                SUM(CASE WHEN o.payment_status IN ('Paid', 'success', 'Completed') THEN o.total_amount ELSE 0 END) as revenue,
                (SELECT COUNT(DISTINCT user_id) FROM orders o2 WHERE ${subFilter.where} AND o2.status != 'Cancelled') as customers
            FROM orders o
            WHERE ${filter.where}
            AND o.status != 'Cancelled'
        `;
        
        const [rows] = await db.query(finalSql, finalParams);
        const current = rows[0];

        return {
            today: {
                revenue: parseFloat(current.revenue || 0),
                orders: parseInt(current.orders || 0),
                customers: parseInt(current.customers || 0)
            },
            growth: { revenue: 0, orders: 0 }
        };
    },

    /**
     * Trend data with range support.
     */
    getTrendData: async (options = {}) => {
        const filter = analyticsService._getDateFilter(options);
        
        const sql = `
            SELECT 
                DATE(o.created_at) as date, 
                SUM(CASE WHEN payment_status IN ('Paid', 'success', 'Completed') THEN total_amount ELSE 0 END) as revenue,
                COUNT(CASE WHEN o.status != 'Cancelled' THEN 1 END) as orders
            FROM orders o
            WHERE ${filter.where}
            GROUP BY DATE(o.created_at)
            ORDER BY DATE(o.created_at) ASC
        `;
        
        const [rows] = await db.query(sql, filter.params);
        
        return rows.map(row => ({
            date: row.date.toISOString().split('T')[0],
            revenue: parseFloat(row.revenue || 0),
            orders: parseInt(row.orders || 0)
        }));
    },

    /**
     * Top Products with range support.
     */
    getTopProducts: async (options = {}) => {
        const filter = analyticsService._getDateFilter(options);
        
        const sql = `
            SELECT 
                oi.product_name as name,
                SUM(oi.quantity) as unitsSold,
                SUM(oi.quantity * oi.price) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.payment_status IN ('Paid', 'success', 'Completed')
              AND ${filter.where}
            GROUP BY oi.product_id, oi.product_name
            ORDER BY unitsSold DESC
            LIMIT 10
        `;
        const [rows] = await db.query(sql, filter.params);
        
        // Category Breakdown
        const categorySql = `
            SELECT c.name as category, SUM(oi.quantity * oi.price) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN sub_categories sc ON p.sub_category_id = sc.sub_category_id
            JOIN categories c ON sc.category_id = c.category_id
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.payment_status IN ('Paid', 'success', 'Completed')
              AND ${filter.where}
            GROUP BY c.name
        `;
        const [categories] = await db.query(categorySql, filter.params);

        return { topProducts: rows, categories };
    },

    /**
     * Customer Analytics with range support.
     */
    getCustomerAnalytics: async (options = {}) => {
        const geography = await analyticsService.getSalesByGeography(options);
        const filter = analyticsService._getDateFilter(options);

        const leaderboardSql = `
            SELECT u.name, u.email, COUNT(o.order_id) as totalOrders, SUM(o.total_amount) as totalSpent
            FROM users u
            JOIN orders o ON u.user_id = o.user_id
            WHERE o.payment_status IN ('Paid', 'success', 'Completed')
              AND ${filter.where}
            GROUP BY u.user_id
            ORDER BY totalSpent DESC
            LIMIT 10
        `;
        const [leaderboard] = await db.query(leaderboardSql, filter.params);

        return { geography, leaderboard };
    },

    /**
     * Insights logic.
     */
    getSmartInsights: async () => {
        const insights = [];
        const trendingSql = `
            SELECT product_name, SUM(quantity) as units
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND o.payment_status IN ('Paid', 'success', 'Completed')
            GROUP BY product_name
            ORDER BY units DESC
            LIMIT 2
        `;
        const [trending] = await db.query(trendingSql);
        trending.forEach(p => {
            insights.push({
                type: 'info',
                title: 'Trending Now',
                message: `${p.product_name} has high demand lately (${p.units} sold this week).`
            });
        });

        return insights;
    },

    /**
     * Geography data with range support.
     */
    getSalesByGeography: async (options = {}) => {
        const filter = analyticsService._getDateFilter(options);
        
        const sql = `
            SELECT 
                LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(shipping_address, '$.state')))) as state_raw, 
                COUNT(*) as orders,
                SUM(total_amount) as revenue
            FROM orders o
            WHERE ${filter.where}
            AND o.payment_status IN ('Paid', 'success', 'Completed')
            GROUP BY state_raw
            ORDER BY revenue DESC
            LIMIT 10
        `;
        const [rows] = await db.query(sql, filter.params);
        
        return rows.map(r => ({
            state: r.state_raw ? r.state_raw.charAt(0).toUpperCase() + r.state_raw.slice(1) : 'Unknown',
            orders: r.orders,
            revenue: parseFloat(r.revenue)
        }));
    }
};

module.exports = analyticsService;
