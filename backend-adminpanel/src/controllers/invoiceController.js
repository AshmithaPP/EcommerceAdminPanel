const invoiceService = require('../services/invoiceService');
const Order = require('../models/orderModel');
const path = require('path');
const fs = require('fs');

const invoiceController = {
    /**
     * Returns the invoice details (path, number, date) for a specific order.
     * If the invoice does not exist yet, it will dynamically generate it (self-healing).
     */
    getInvoiceDetails: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            const order = await Order.findById(order_id);

            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Security: Customers can only fetch their own invoice. Admins can fetch any.
            if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && order.user_id !== req.user.user_id) {
                return res.status(403).json({ success: false, message: 'Unauthorized access' });
            }

            // Try fetching the invoice. If not generated, force-generate it (self-healing)
            let invoice = await invoiceService.getInvoiceByOrderId(order_id);
            if (!invoice) {
                invoice = await invoiceService.generateInvoice(order_id);
            }

            res.status(200).json({
                success: true,
                data: {
                    invoice_number: invoice.invoice_number,
                    invoice_path: invoice.invoice_path,
                    invoice_date: invoice.invoice_date
                }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Downloads the actual invoice PDF for an order.
     */
    downloadInvoicePDF: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            const order = await Order.findById(order_id);

            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Security check
            if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && order.user_id !== req.user.user_id) {
                return res.status(403).json({ success: false, message: 'Unauthorized access' });
            }

            let invoice = await invoiceService.getInvoiceByOrderId(order_id);
            if (!invoice) {
                invoice = await invoiceService.generateInvoice(order_id);
            }

            const absolutePath = path.join(__dirname, '..', '..', invoice.invoice_path);
            if (!fs.existsSync(absolutePath)) {
                return res.status(404).json({ success: false, message: 'Invoice PDF file not found on server' });
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
            
            const fileStream = fs.createReadStream(absolutePath);
            fileStream.pipe(res);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Admin trigger to resend the invoice to the customer
     */
    resendInvoiceEmail: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            const order = await Order.findById(order_id);

            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            const db = require('../config/database');
            const [users] = await db.query('SELECT name, email FROM users WHERE user_id = ?', [order.user_id]);
            const customer = users[0];

            if (!customer || !customer.email) {
                return res.status(400).json({ success: false, message: 'Customer email not found' });
            }

            let invoice = await invoiceService.getInvoiceByOrderId(order_id);
            if (!invoice) {
                invoice = await invoiceService.generateInvoice(order_id);
            }

            const absolutePath = path.join(__dirname, '..', '..', invoice.invoice_path);
            const { sendInvoiceEmail } = require('../utils/emailService');

            await sendInvoiceEmail(
                customer.email,
                customer.name || 'Customer',
                order.order_number,
                invoice.invoice_number,
                absolutePath
            );

            res.status(200).json({
                success: true,
                message: `Invoice email resent successfully to ${customer.email}`
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = invoiceController;
