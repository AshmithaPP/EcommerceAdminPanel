const db = require('../config/database');

const dashboardService = {
    getSummary: async () => {
        const query = `
            SELECT 
                (SELECT SUM(total_amount) FROM orders WHERE payment_status = 'Paid') as totalRevenue,
                (SELECT COUNT(*) FROM orders) as totalOrders,
                (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()) as todayOrders,
                (SELECT COUNT(*) FROM users WHERE role = 'user') as totalCustomers,
                (SELECT COUNT(*) FROM products WHERE status = 1) as totalActiveProducts
        `;
        const [rows] = await db.query(query);
        const summary = rows[0];
        
        return {
            totalRevenue: parseFloat(summary.totalRevenue || 0),
            totalOrders: parseInt(summary.totalOrders || 0),
            todayOrders: parseInt(summary.todayOrders || 0),
            totalCustomers: parseInt(summary.totalCustomers || 0),
            totalActiveProducts: parseInt(summary.totalActiveProducts || 0)
        };
    },

    getSalesTrend: async () => {
        // Last 30 days
        const currentPeriodQuery = `
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') as date,
                SUM(total_amount) as revenue,
                COUNT(*) as orderCount
            FROM orders
            WHERE payment_status = 'Paid' 
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            GROUP BY date
            ORDER BY date ASC
        `;
        
        // Previous 30 days for comparison
        const previousPeriodQuery = `
            SELECT 
                SUM(total_amount) as revenue,
                COUNT(*) as orderCount
            FROM orders
            WHERE payment_status = 'Paid'
            AND created_at BETWEEN DATE_SUB(CURDATE(), INTERVAL 59 DAY) AND DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `;

        const [currentRows] = await db.query(currentPeriodQuery);
        const [previousRows] = await db.query(previousPeriodQuery);

        const currentRevenue = currentRows.reduce((sum, row) => sum + parseFloat(row.revenue), 0);
        const previousRevenue = parseFloat(previousRows[0].revenue || 0);
        const revenueGrowth = previousRevenue === 0 ? 100 : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

        return {
            trend: currentRows.map(row => ({
                date: row.date,
                revenue: parseFloat(row.revenue),
                orderCount: parseInt(row.orderCount)
            })),
            comparison: {
                currentRevenue,
                previousRevenue,
                revenueGrowth: parseFloat(revenueGrowth.toFixed(2))
            }
        };
    },

    getTopProducts: async (limit = 5) => {
        const query = `
            SELECT 
                oi.product_name as name,
                SUM(oi.quantity) as unitsSold,
                SUM(oi.quantity * oi.price) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.payment_status = 'Paid'
            GROUP BY oi.product_id, oi.product_name
            ORDER BY unitsSold DESC
            LIMIT ?
        `;
        const [rows] = await db.query(query, [parseInt(limit)]);
        return rows.map(row => ({
            name: row.name,
            unitsSold: parseInt(row.unitsSold),
            revenue: parseFloat(row.revenue)
        }));
    },

    getAlerts: async () => {
        const query = `
            SELECT
                (SELECT COUNT(*) FROM inventory_levels WHERE quantity <= low_stock_threshold AND quantity > 0) as lowStockCount,
                (SELECT COUNT(*) FROM inventory_levels WHERE quantity = 0) as outOfStockCount,
                (SELECT COUNT(*) FROM orders WHERE status = 'Pending') as pendingOrdersCount,
                (SELECT COUNT(*) FROM orders WHERE payment_status = 'Failed') as failedPaymentsCount
        `;
        const [rows] = await db.query(query);
        const alerts = rows[0];

        // Fetch actual low stock products details
        const lowStockQuery = `
            SELECT p.name, inv.quantity, inv.low_stock_threshold
            FROM inventory_levels inv
            JOIN product_variants pv ON inv.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            WHERE inv.quantity <= inv.low_stock_threshold
            LIMIT 5
        `;
        const [lowStockDetails] = await db.query(lowStockQuery);

        return {
            counts: {
                lowStock: parseInt(alerts.lowStockCount || 0),
                outOfStock: parseInt(alerts.outOfStockCount || 0),
                pendingOrders: parseInt(alerts.pendingOrdersCount || 0),
                failedPayments: parseInt(alerts.failedPaymentsCount || 0)
            },
            lowStockProducts: lowStockDetails
        };
    },

    getRecentOrders: async () => {
        const query = `
            SELECT 
                o.order_id,
                o.order_number,
                o.total_amount as amount,
                o.status,
                o.created_at,
                u.name as customerName
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            ORDER BY o.created_at DESC
            LIMIT 10
        `;
        const [rows] = await db.query(query);
        return rows.map(row => ({
            orderId: row.order_id,
            orderNumber: row.order_number,
            customerName: row.customerName,
            amount: parseFloat(row.amount),
            status: row.status,
            createdAt: row.created_at
        }));
    },
    getComparativeAnalytics: async () => {
        const currentMonthQuery = `
            SELECT 
                (SELECT SUM(total_amount) FROM orders WHERE payment_status = 'Paid' AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())) as revenue,
                (SELECT COUNT(*) FROM orders WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())) as orders,
                (SELECT COUNT(*) FROM users WHERE role = 'user' AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())) as customers
        `;
        
        const lastMonthQuery = `
            SELECT 
                (SELECT SUM(total_amount) FROM orders WHERE payment_status = 'Paid' AND MONTH(created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(created_at) = YEAR(CURDATE() - INTERVAL 1 MONTH)) as revenue,
                (SELECT COUNT(*) FROM orders WHERE MONTH(created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(created_at) = YEAR(CURDATE() - INTERVAL 1 MONTH)) as orders,
                (SELECT COUNT(*) FROM users WHERE role = 'user' AND MONTH(created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(created_at) = YEAR(CURDATE() - INTERVAL 1 MONTH)) as customers
        `;

        const [currentRows] = await db.query(currentMonthQuery);
        const [lastRows] = await db.query(lastMonthQuery);

        const current = {
            revenue: parseFloat(currentRows[0].revenue || 0),
            orders: parseInt(currentRows[0].orders || 0),
            customers: parseInt(currentRows[0].customers || 0)
        };

        const last = {
            revenue: parseFloat(lastRows[0].revenue || 0),
            orders: parseInt(lastRows[0].orders || 0),
            customers: parseInt(lastRows[0].customers || 0)
        };

        const calculateGrowth = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return parseFloat((((curr - prev) / prev) * 100).toFixed(2));
        };

        return {
            thisMonth: current,
            lastMonth: last,
            growth: {
                revenue: calculateGrowth(current.revenue, last.revenue),
                orders: calculateGrowth(current.orders, last.orders),
                customers: calculateGrowth(current.customers, last.customers)
            }
        };
    },

    getOrderStatusAnalytics: async () => {
        const query = `
            SELECT status, COUNT(*) as count 
            FROM orders 
            GROUP BY status
        `;
        const [rows] = await db.query(query);
        
        const statusCounts = {
            Pending: 0,
            Processing: 0,
            Shipped: 0,
            Delivered: 0,
            Cancelled: 0
        };

        rows.forEach(row => {
            if (statusCounts.hasOwnProperty(row.status)) {
                statusCounts[row.status] = parseInt(row.count);
            } else {
                statusCounts[row.status] = parseInt(row.count);
            }
        });

        return statusCounts;
    },

    getExportData: async (startDate, endDate) => {
        const start = startDate + ' 00:00:00';
        const end = endDate + ' 23:59:59';

        const ordersQuery = `
            SELECT o.order_id, o.order_number, o.total_amount, o.status, o.created_at, u.name as customer_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.user_id
            WHERE o.created_at >= ? AND o.created_at <= ?
            ORDER BY o.created_at DESC
        `;
        const [orders] = await db.query(ordersQuery, [start, end]);
        
        const summaryQuery = `
            SELECT 
                COUNT(*) as totalOrders,
                SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) as totalRevenue,
                SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as deliveredCount,
                SUM(CASE WHEN status = 'Processing' THEN 1 ELSE 0 END) as processingCount,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledCount
            FROM orders
            WHERE created_at >= ? AND created_at <= ?
        `;
        const [summaryRows] = await db.query(summaryQuery, [start, end]);
        const summary = summaryRows[0];

        // Top 3 Products in this period
        const topProductsQuery = `
            SELECT 
                oi.product_name as name,
                SUM(oi.quantity) as unitsSold
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.created_at >= ? AND o.created_at <= ?
            AND o.payment_status = 'Paid'
            GROUP BY oi.product_name
            ORDER BY unitsSold DESC
            LIMIT 3
        `;
        const [topProducts] = await db.query(topProductsQuery, [start, end]);

        // Customer Growth - Total registered till end date, and new ones in period
        const customerGrowthQuery = `
            SELECT
                (SELECT COUNT(*) FROM users WHERE role = 'user' AND created_at <= ?) as totalCustomers,
                (SELECT COUNT(*) FROM users WHERE role = 'user' AND created_at >= ? AND created_at <= ?) as newCustomers
        `;
        const [growthRows] = await db.query(customerGrowthQuery, [end, start, end]);
        const growth = growthRows[0];

        return {
            orders,
            summary: {
                ...summary,
                totalCustomers: parseInt(growth.totalCustomers || 0),
                newCustomers: parseInt(growth.newCustomers || 0)
            },
            topProducts
        };
    }

};

module.exports = dashboardService;
