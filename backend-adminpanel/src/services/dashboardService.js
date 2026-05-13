const db = require('../config/database');

const dashboardService = {
    getOverview: async (options = {}) => {
        const { range = '30days', startDate, endDate } = options;
        
        let start, end;
        if (startDate && endDate) {
            start = startDate;
            end = endDate;
        } else {
            end = 'CURDATE()';
            if (range === 'today') start = 'CURDATE()';
            else if (range === '7days') start = 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
            else if (range === 'thisMonth') start = "DATE_FORMAT(CURDATE(), '%Y-%m-01')";
            else start = 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        }

        const startExpr = (startDate && endDate) ? '?' : start;
        const endExpr = (startDate && endDate) ? '?' : end;
        const params = (startDate && endDate) ? [start, end] : [];

        // 1. Summary Stats (Filtered by Date for revenue/orders, but total customers is all-time buyers)
        const [summaryRows] = await db.query(`
            SELECT 
                SUM(CASE WHEN payment_status IN ('Paid', 'success', 'Completed') THEN total_amount ELSE 0 END) as total_revenue,
                COUNT(CASE WHEN status != 'Cancelled' THEN 1 END) as total_orders,
                COUNT(CASE WHEN DATE(created_at) = CURDATE() AND status != 'Cancelled' THEN 1 END) as today_orders,
                (SELECT COUNT(DISTINCT user_id) FROM orders) as total_customers,
                (SELECT COUNT(*) FROM products WHERE status = 1) as active_products
            FROM orders
            WHERE created_at BETWEEN ${startExpr} AND DATE_ADD(${endExpr}, INTERVAL 1 DAY)
        `, params);

        // 2. Alerts (STAY LIVE - NO DATE FILTER)
        const [alertRows] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM inventory_levels il JOIN product_variants pv ON il.variant_id = pv.variant_id WHERE il.quantity > 0 AND il.quantity <= 5) as low_stock,
                (SELECT COUNT(*) FROM inventory_levels il JOIN product_variants pv ON il.variant_id = pv.variant_id WHERE il.quantity = 0) as out_of_stock,
                (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
                (SELECT COUNT(*) FROM payments WHERE status = 'failed') as failed_payments
        `);

        // 3. Recent Orders (Filtered by Date)
        const [recentOrders] = await db.query(`
            SELECT 
                o.order_id, o.order_number, o.total_amount as amount, o.status, o.created_at,
                u.name as customer_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.user_id
            WHERE o.created_at BETWEEN ${startExpr} AND DATE_ADD(${endExpr}, INTERVAL 1 DAY)
            ORDER BY o.created_at DESC
            LIMIT 10
        `, params);

        // 4. Order Status Breakdown (Filtered by Date)
        const [statusRows] = await db.query(`
            SELECT status, COUNT(*) as count
            FROM orders
            WHERE created_at BETWEEN ${startExpr} AND DATE_ADD(${endExpr}, INTERVAL 1 DAY)
            GROUP BY status
        `, params);

        const orderStatus = {
            pending: 0, processing: 0, shipped: 0, dispatched: 0, delivered: 0, cancelled: 0
        };
        statusRows.forEach(row => {
            const s = row.status?.toLowerCase();
            if (orderStatus.hasOwnProperty(s)) {
                orderStatus[s] = row.count;
            }
        });

        return {
            summary: summaryRows[0],
            alerts: alertRows[0],
            recent_orders: recentOrders,
            order_status: orderStatus
        };
    },

    getSalesTrend: async (options = {}) => {
        let { range = '30days', startDate, endDate } = options;
        
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
            else start = 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)'; // default 30days
        }

        const startExpr = (startDate && endDate) ? '?' : start;
        const endExpr = (startDate && endDate) ? '?' : end;
        const params = (startDate && endDate) ? [start, end] : [];

        // Trend Data
        const [trend] = await db.query(`
            SELECT 
                DATE(created_at) as date,
                SUM(total_amount) as revenue,
                COUNT(*) as orders
            FROM orders
            WHERE created_at BETWEEN ${startExpr} AND DATE_ADD(${endExpr}, INTERVAL 1 DAY)
              AND payment_status IN ('success', 'Paid', 'Completed')
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, params);

        // For comparison, we use the same duration prior to the current range
        // This is complex for custom ranges, so we'll simplify for now or focus on the trend
        return {
            trend,
            comparison: {
                current_revenue: trend.reduce((sum, r) => sum + parseFloat(r.revenue), 0),
                previous_revenue: 0, // Simplified for now
                growth_percentage: 0
            }
        };
    },

    getTopProducts: async (options = {}) => {
        const { limit = 5, range = '30days', startDate, endDate } = options;
        
        let start, end;
        if (startDate && endDate) {
            start = startDate;
            end = endDate;
        } else {
            end = 'CURDATE()';
            if (range === 'today') start = 'CURDATE()';
            else if (range === '7days') start = 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
            else if (range === 'thisMonth') start = "DATE_FORMAT(CURDATE(), '%Y-%m-01')";
            else start = 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        }

        const startExpr = (startDate && endDate) ? '?' : start;
        const endExpr = (startDate && endDate) ? '?' : end;
        const params = (startDate && endDate) ? [start, end, parseInt(limit)] : [parseInt(limit)];

        const [rows] = await db.query(`
            SELECT 
                oi.product_name,
                SUM(oi.quantity) as units_sold,
                CAST(SUM(oi.price * oi.quantity) AS DECIMAL(10,2)) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.payment_status IN ('success', 'Paid', 'Completed')
              AND o.created_at BETWEEN ${startExpr} AND DATE_ADD(${endExpr}, INTERVAL 1 DAY)
            GROUP BY oi.product_id, oi.product_name
            ORDER BY units_sold DESC
            LIMIT ?
        `, params);
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
                COUNT(*) as new_customers
            FROM users 
            WHERE role = 'user' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `);
        
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
                SUM(CASE WHEN p.status = 'success' THEN 1 ELSE 0 END) / COUNT(*) * 100 as razorpay_success_rate,
                SUM(CASE WHEN o.payment_method = 'cod' THEN 1 ELSE 0 END) / COUNT(*) * 100 as cod_percentage,
                SUM(CASE WHEN p.status = 'failed' THEN 1 ELSE 0 END) as failed_payments
            FROM payments p
            JOIN orders o ON p.order_id = o.order_id
        `);
        return rows[0];
    },

    getInventoryHealth: async () => {
        const [statsRows] = await db.query(`
            SELECT 
                SUM(il.quantity * pv.price) as total_stock_value,
                COUNT(CASE WHEN il.quantity > 0 AND il.quantity <= 5 THEN 1 END) as low_stock_count,
                COUNT(CASE WHEN il.quantity = 0 THEN 1 END) as out_of_stock_count
            FROM inventory_levels il
            JOIN product_variants pv ON il.variant_id = pv.variant_id
        `);

        const [lowStockItems] = await db.query(`
            SELECT 
                p.product_id, p.name as product_name, pv.sku, il.quantity,
                GROUP_CONCAT(CONCAT(a.name, ': ', av.value) SEPARATOR ', ') as attributes_summary
            FROM inventory_levels il
            JOIN product_variants pv ON il.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            LEFT JOIN variant_attributes va ON pv.variant_id = va.variant_id
            LEFT JOIN attributes a ON va.attribute_id = a.attribute_id
            LEFT JOIN attribute_values av ON va.attribute_value_id = av.attribute_value_id
            WHERE il.quantity <= 5
            GROUP BY il.inventory_id, p.product_id, p.name, pv.sku, il.quantity
            ORDER BY il.quantity ASC
            LIMIT 20
        `);

        return {
            stats: statsRows[0],
            low_stock_items: lowStockItems
        };
    }
};

module.exports = dashboardService;
