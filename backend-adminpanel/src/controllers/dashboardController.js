const dashboardService = require('../services/dashboardService');
const PDFDocument = require('pdfkit');

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
    },

    getComparativeAnalytics: async (req, res, next) => {
        try {
            const data = await dashboardService.getComparativeAnalytics();
            res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            next(error);
        }
    },

    getOrderStatusAnalytics: async (req, res, next) => {
        try {
            const data = await dashboardService.getOrderStatusAnalytics();
            res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            next(error);
        }
    },

    downloadReport: async (req, res, next) => {
        try {
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                return res.status(400).json({ success: false, message: 'Start date and end date are required (YYYY-MM-DD)' });
            }

            const data = await dashboardService.getExportData(startDate, endDate);

            // Utils for formatting
            const formatCurrency = (val) => `Rs. ${parseFloat(val || 0).toFixed(2)}`; // Using Rs. because standard PDF fonts don't support ₹
            const formatDate = (date) => {
                const d = new Date(date);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            };
            const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

            const doc = new PDFDocument({ margin: 50 });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Analytics_Report_${startDate}_to_${endDate}.pdf`);

            doc.pipe(res);

            // --- Header Section ---
            doc.font('Helvetica-Bold').fontSize(22).text('Analytics Report', { align: 'center' });
            doc.moveDown(0.2);
            doc.font('Helvetica').fontSize(12).text(`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`, { align: 'center' });
            doc.moveDown(1.5);

            // --- Summary Section (2-Column Layout) ---
            doc.font('Helvetica-Bold').fontSize(16).text('Summary');
            doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(1).stroke();
            doc.moveDown(0.8);

            const aov = data.summary.totalOrders > 0 
                ? (parseFloat(data.summary.totalRevenue || 0) / data.summary.totalOrders).toFixed(2)
                : "0.00";

            const leftCol = 50;
            const rightCol = 320;
            let currentY = doc.y;

            // Row 1: Finance
            doc.font('Helvetica-Bold').fontSize(11).text('Total Revenue: ', leftCol, currentY, { continued: true })
               .font('Helvetica').text(formatCurrency(data.summary.totalRevenue));
            
            doc.font('Helvetica-Bold').text('Avg (AOV): ', rightCol, currentY, { continued: true })
               .font('Helvetica').text(formatCurrency(aov));
            
            doc.moveDown(1.2);
            currentY = doc.y;

            // Row 2: Status & Customers
            doc.font('Helvetica-Bold').fontSize(13).text('Order Status Breakdown', leftCol, currentY);
            doc.text('Customer Growth', rightCol, currentY);
            doc.moveDown(0.4);
            currentY = doc.y;

            doc.font('Helvetica').fontSize(11);
            doc.text(`• Delivered: ${data.summary.deliveredCount || 0}`, leftCol + 10, currentY);
            doc.text(`• Total Customers: ${data.summary.totalCustomers || 0}`, rightCol + 10, currentY);
            currentY += 18;

            doc.text(`• Processing: ${data.summary.processingCount || 0}`, leftCol + 10, currentY);
            doc.text(`• New Customers: ${data.summary.newCustomers || 0}`, rightCol + 10, currentY);
            currentY += 18;

            doc.text(`• Cancelled: ${data.summary.cancelledCount || 0}`, leftCol + 10, currentY);
            
            doc.y = currentY + 25;

            // --- Top Products ---
            if (data.topProducts && data.topProducts.length > 0) {
                doc.font('Helvetica-Bold').fontSize(14).text('Top Selling Products');
                doc.moveDown(0.4);
                doc.font('Helvetica').fontSize(11);
                data.topProducts.forEach((product) => {
                    doc.text(`• ${product.name} (${product.unitsSold} units sold)`);
                });
                doc.moveDown(2);
            }

            // --- Orders Detail Table ---
            doc.font('Helvetica-Bold').fontSize(16).text('Detailed Orders List');
            doc.moveDown(0.5);

            let tableY = doc.y;
            doc.fontSize(10);
            
            // Table Header Background (Optional for professional look)
            doc.font('Helvetica-Bold');
            doc.text('Order ID', 50, tableY, { width: 100 });
            doc.text('Customer', 150, tableY, { width: 150 });
            doc.text('Status', 300, tableY, { width: 75 });
            doc.text('Date', 375, tableY, { width: 95 });
            doc.text('Amount', 470, tableY, { width: 80, align: 'right' });

            doc.moveTo(50, tableY + 15).lineTo(550, tableY + 15).lineWidth(1).stroke();
            tableY += 25;

            doc.font('Helvetica');
            data.orders.forEach(order => {
                if (tableY > 700) {
                    doc.addPage();
                    tableY = 50;
                }
                const dateStr = formatDate(order.created_at);
                doc.text(order.order_number || order.order_id, 50, tableY, { width: 100 });
                doc.text(order.customer_name || 'Guest', 150, tableY, { width: 150 });
                doc.text(capitalize(order.status), 300, tableY, { width: 75 });
                doc.text(dateStr, 375, tableY, { width: 95 });
                doc.text(formatCurrency(order.total_amount), 470, tableY, { width: 80, align: 'right' });
                tableY += 20;
            });

            doc.end();

        } catch (error) {
            next(error);
        }
    }

};

module.exports = dashboardController;
