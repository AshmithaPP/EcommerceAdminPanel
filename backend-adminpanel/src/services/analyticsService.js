const db = require('../config/database');

const analyticsService = {
    /**
     * Aggregates stats for a single date and updates the daily_stats table.
     * This is the heart of the "Pre-aggregated" strategy.
     */
    updateDailyStats: async (date) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Get stats for the day from orders table
            // Only counting Paid orders as Revenue
            const sql = `
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) as total_revenue,
                    SUM(CASE WHEN status != 'Cancelled' THEN (SELECT SUM(quantity) FROM order_items WHERE order_id = o.order_id) ELSE 0 END) as total_items_sold,
                    SUM(discount_amount) as total_discount,
                    (SELECT COUNT(*) FROM users WHERE role = 'user' AND DATE(created_at) = ?) as new_customers
                FROM orders o
                WHERE DATE(o.created_at) = ?
                AND o.status != 'Cancelled'
            `;
            
            const [rows] = await connection.query(sql, [date, date]);
            const stats = rows[0];

            // 2. Compute refunds (if you have a refunds table, otherwise 0 for now)
            const total_refunds = 0; 

            // 3. Upsert into daily_stats
            await connection.query(`
                INSERT INTO daily_stats 
                    (date, total_orders, total_revenue, total_items_sold, total_discount, total_refunds, new_customers)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    total_orders = VALUES(total_orders),
                    total_revenue = VALUES(total_revenue),
                    total_items_sold = VALUES(total_items_sold),
                    total_discount = VALUES(total_discount),
                    total_refunds = VALUES(total_refunds),
                    new_customers = VALUES(new_customers)
            `, [
                date, stats.total_orders || 0, stats.total_revenue || 0, stats.total_items_sold || 0,
                stats.total_discount || 0, total_refunds, stats.new_customers || 0
            ]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error(`Error updating daily stats for ${date}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Fast retrieval for KPI cards with comparison indicators.
     */
    getSummaryStats: async () => {
        // We get Today's live stats (Fast query) and compare with Yesterday (from daily_stats)
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Today's Live (Faster than scanning everything)
        const liveSql = `
            SELECT 
                COUNT(*) as orders,
                SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) as revenue,
                (SELECT COUNT(*) FROM users WHERE role = 'user' AND DATE(created_at) = CURDATE()) as customers
            FROM orders o
            WHERE DATE(created_at) = CURDATE()
            AND status != 'Cancelled'
        `;
        const [liveRows] = await db.query(liveSql);
        const live = liveRows[0];

        // Historical Aggregates for comparison
        const [historicalRows] = await db.query(`
            SELECT * FROM daily_stats WHERE date = ? OR date = DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        `, [yesterday]);
        
        const yesterdayStats = historicalRows.find(r => r.date.toISOString().split('T')[0] === yesterday) || {};
        
        const calculateGrowth = (curr, prev) => {
            if (!prev || prev == 0) return curr > 0 ? 100 : 0;
            return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
        };

        return {
            today: {
                revenue: parseFloat(live.revenue || 0),
                orders: parseInt(live.orders || 0),
                customers: parseInt(live.customers || 0)
            },
            yesterday: {
                revenue: parseFloat(yesterdayStats.total_revenue || 0),
                orders: parseInt(yesterdayStats.total_orders || 0)
            },
            growth: {
                revenue: calculateGrowth(live.revenue, yesterdayStats.total_revenue),
                orders: calculateGrowth(live.orders, yesterdayStats.total_orders)
            }
        };
    },

    /**
     * Serves chart data from the pre-aggregated table.
     */
    getTrendData: async (days = 30) => {
        const sql = `
            SELECT date, total_revenue as revenue, total_orders as orders
            FROM daily_stats
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            ORDER BY date ASC
        `;
        const [rows] = await db.query(sql, [parseInt(days)]);
        return rows.map(row => ({
            ...row,
            date: row.date.toISOString().split('T')[0]
        }));
    },

    /**
     * Actionable business insights based on concrete logic.
     */
    getSmartInsights: async () => {
        const insights = [];

        // 1. Sales Drop Alert
        const summary = await analyticsService.getSummaryStats();
        if (summary.growth.revenue < -20 && summary.today.revenue > 0) {
            insights.push({
                type: 'warning',
                title: 'Sales Drop Detected',
                message: `Revenue is down ${Math.abs(summary.growth.revenue)}% compared to yesterday.`
            });
        }

        // 2. Trending Products (Top sold in last 7 days vs previous 7)
        const trendingSql = `
            SELECT product_name, SUM(quantity) as units
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
            AND o.payment_status = 'Paid'
            GROUP BY product_name
            ORDER BY units DESC
            LIMIT 3
        `;
        const [trending] = await db.query(trendingSql);
        trending.forEach(p => {
            insights.push({
                type: 'info',
                title: 'Trending Product',
                message: `${p.product_name} is performing well with ${p.units} units sold recently.`
            });
        });

        return insights;
    },


    getSalesByGeography: async () => {
        const sql = `
            SELECT 
                LOWER(TRIM(state)) as state_raw, 
                COUNT(*) as orders,
                SUM(total_amount) as revenue
            FROM order_addresses oa
            JOIN orders o ON oa.order_id = o.order_id
            WHERE o.payment_status = 'Paid'
            GROUP BY state_raw
            ORDER BY revenue DESC
            LIMIT 10
        `;
        const [rows] = await db.query(sql);
        
        // Basic normalization map could be added here
        return rows.map(r => ({
            state: r.state_raw ? r.state_raw.charAt(0).toUpperCase() + r.state_raw.slice(1) : 'Unknown',
            orders: r.orders,
            revenue: parseFloat(r.revenue)
        }));
    }
};

module.exports = analyticsService;
