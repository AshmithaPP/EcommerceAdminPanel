const db = require('../config/database');

const dashboardService = {
    getOverview: async () => {
        // 1. Summary Stats
        const [summaryRows] = await db.query(`
            SELECT 
                SUM(CASE WHEN payment_status IN ('Paid', 'success', 'Completed') THEN total_amount ELSE 0 END) as total_revenue,
                COUNT(CASE WHEN status != 'Cancelled' THEN 1 END) as total_orders,
                COUNT(CASE WHEN DATE(created_at) = CURDATE() AND status != 'Cancelled' THEN 1 END) as today_orders,
                (SELECT COUNT(*) FROM users WHERE role = 'user') as total_customers,
                (SELECT COUNT(*) FROM products WHERE status = 1) as active_products
            FROM orders
        `);

        // 2. Alerts
        const [alertRows] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM inventory_levels WHERE quantity > 0 AND quantity <= 5) as low_stock,
                (SELECT COUNT(*) FROM inventory_levels WHERE quantity = 0) as out_of_stock,
                (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
                (SELECT COUNT(*) FROM payments WHERE status = 'failed') as failed_payments
        `);

        // 3. Recent Orders
        const [recentOrders] = await db.query(`
            SELECT 
                o.order_id, o.order_number, o.total_amount as amount, o.status, o.created_at,
                u.name as customer_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.user_id
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

        // 4. Order Status Breakdown
        const [statusRows] = await db.query(`
            SELECT status, COUNT(*) as count
            FROM orders
            GROUP BY status
        `);

        const orderStatus = {
            pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0
        };
        statusRows.forEach(row => {
            if (orderStatus.hasOwnProperty(row.status)) {
                orderStatus[row.status] = row.count;
            }
        });

        return {
            summary: summaryRows[0],
            alerts: alertRows[0],
            recent_orders: recentOrders,
            order_status: orderStatus
        };
    },

    getSalesTrend: async (range = '30days') => {
        let days = 30;
        if (range === '7days') days = 7;
        if (range === '90days') days = 90;

        // Trend Data
        const [trend] = await db.query(`
            SELECT 
                DATE(created_at) as date,
                SUM(total_amount) as revenue,
                COUNT(*) as orders
            FROM orders
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
              AND payment_status = 'success'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [days]);

        // Comparison Data (Current vs Previous Period)
        const [comparisonRows] = await db.query(`
            SELECT 
                SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN total_amount ELSE 0 END) as current_revenue,
                SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN total_amount ELSE 0 END) as previous_revenue
            FROM orders
            WHERE payment_status = 'success'
        `, [days, days * 2, days]);

        const current_revenue = parseFloat(comparisonRows[0].current_revenue || 0);
        const previous_revenue = parseFloat(comparisonRows[0].previous_revenue || 0);
        let growth_percentage = 0;
        if (previous_revenue > 0) {
            growth_percentage = ((current_revenue - previous_revenue) / previous_revenue) * 100;
        }

        return {
            trend,
            comparison: {
                current_revenue,
                previous_revenue,
                growth_percentage: parseFloat(growth_percentage.toFixed(2))
            }
        };
    },

    getTopProducts: async (limit = 5) => {
        const [rows] = await db.query(`
            SELECT 
                oi.product_name,
                SUM(oi.quantity) as units_sold,
                CAST(SUM(oi.price * oi.quantity) AS DECIMAL(10,2)) as gross_revenue,
                CAST(SUM(CASE 
                    WHEN o.subtotal > 0 THEN (oi.price * oi.quantity / o.subtotal) * o.discount 
                    ELSE 0 
                END) AS DECIMAL(10,2)) as discount_amount,
                CAST(SUM(oi.price * oi.quantity) - SUM(CASE 
                    WHEN o.subtotal > 0 THEN (oi.price * oi.quantity / o.subtotal) * o.discount 
                    ELSE 0 
                END) AS DECIMAL(10,2)) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.payment_status = 'success'
            GROUP BY oi.product_id, oi.product_name
            ORDER BY units_sold DESC
            LIMIT ?
        `, [parseInt(limit)]);
        return rows;
    },

    getRevenueBreakdown: async () => {
        const [rows] = await db.query(`
            SELECT 
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END) as daily,
                SUM(CASE WHEN YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) THEN total_amount ELSE 0 END) as weekly,
                SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN total_amount ELSE 0 END) as monthly
            FROM orders
            WHERE payment_status = 'success'
        `);
        return rows[0];
    },

    getTopCategories: async () => {
        const [rows] = await db.query(`
            SELECT 
                c.name as category_name,
                SUM(oi.quantity) as total_sales
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN categories c ON p.category_id = c.category_id
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.payment_status = 'success'
            GROUP BY c.category_id
            ORDER BY total_sales DESC
            LIMIT 5
        `);
        return rows;
    },

    getCustomerInsights: async () => {
        const [rows] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE role = 'user' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as new_customers,
                (SELECT COUNT(DISTINCT user_id) FROM orders GROUP BY user_id HAVING COUNT(order_id) > 1) as returning_customers_count
        `);
        // Returning customers is a bit trickier with nested subqueries in SELECT if not careful.
        // Let's refine returning customers.
        const [returningRows] = await db.query(`
            SELECT COUNT(*) as count FROM (
                SELECT user_id FROM orders GROUP BY user_id HAVING COUNT(order_id) > 1
            ) as t
        `);

        return {
            new_customers: rows[0].new_customers,
            returning_customers: returningRows[0].count
        };
    },

    getPaymentAnalytics: async () => {
        const [rows] = await db.query(`
            SELECT 
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*) * 100 as razorpay_success_rate,
                SUM(CASE WHEN payment_method = 'cod' THEN 1 ELSE 0 END) / COUNT(*) * 100 as cod_percentage,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_payments
            FROM payments
        `);
        return rows[0];
    },

    getInventoryHealth: async () => {
        const [rows] = await db.query(`
            SELECT 
                SUM(il.quantity * p.price) as total_stock_value,
                COUNT(CASE WHEN il.quantity > 0 AND il.quantity <= 5 THEN 1 END) as low_stock_products,
                COUNT(CASE WHEN il.quantity = 0 THEN 1 END) as out_of_stock_products
            FROM inventory_levels il
            JOIN products p ON il.product_id = p.product_id
        `);
        return rows[0];
    }
};

module.exports = dashboardService;
