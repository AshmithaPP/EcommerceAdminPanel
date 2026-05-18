const db = require('../config/database');
const Order = require('../models/orderModel');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { sendInvoiceEmail } = require('../utils/emailService');
const path = require('path');

const invoiceService = {
    /**
     * Automatically generates an invoice for an order if it doesn't already exist.
     * Generates a unique invoice number, creates the invoice PDF, saves the record,
     * and sends the invoice to the customer via email with the PDF attached.
     * @param {string} orderId The unique UUID of the order
     * @returns {Promise<Object>} The generated invoice database record
     */
    generateInvoice: async (orderId) => {
        console.log(`📄 Starting automated invoice orchestration for order: ${orderId}`);
        
        // 1. Double-Check Lock (prevent duplicates)
        const [existing] = await db.query('SELECT * FROM invoices WHERE order_id = ?', [orderId]);
        if (existing.length > 0) {
            console.log(`ℹ️ Invoice already exists for order ${orderId}: ${existing[0].invoice_number}`);
            return existing[0];
        }

        // 2. Fetch Detailed Order Information
        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error(`Order not found: ${orderId}`);
        }

        // 3. Fetch Customer info (name, email, phone) from users table
        const [users] = await db.query('SELECT name, email, phone FROM users WHERE user_id = ?', [order.user_id]);
        const customer = users[0] || { name: 'Valued Customer', email: 'ashmitha048@gmail.com', phone: '' };

        // 4. Generate Unique Invoice Number (INV-YYYYMMDD-XXXX)
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        
        let invoiceNumber = '';
        let isUnique = false;
        let retries = 0;
        
        while (!isUnique && retries < 5) {
            const randomDigits = Math.floor(1000 + Math.random() * 9000);
            invoiceNumber = `INV-${dateStr}-${randomDigits}`;
            
            // Verify uniqueness
            const [dupCheck] = await db.query('SELECT id FROM invoices WHERE invoice_number = ?', [invoiceNumber]);
            if (dupCheck.length === 0) {
                isUnique = true;
            }
            retries++;
        }

        if (!isUnique) {
            invoiceNumber = `INV-${dateStr}-${Date.now().toString().slice(-4)}`;
        }

        const invoiceDateStr = now.toISOString().slice(0, 19).replace('T', ' ');

        // 5. Generate the Invoice PDF
        let pdfPath = '';
        try {
            pdfPath = await generateInvoicePDF(order, customer, invoiceNumber, now.toLocaleDateString('en-IN'));
            console.log(`✅ Invoice PDF generated successfully at: ${pdfPath}`);
        } catch (pdfErr) {
            console.error(`❌ Invoice PDF generation failed for order ${orderId}:`, pdfErr);
            throw new Error(`Invoice PDF generation failed: ${pdfErr.message}`);
        }

        // 6. Save Invoice Details to the Database
        const relativePath = `/uploads/invoices/${path.basename(pdfPath)}`;
        
        await db.query(
            'INSERT INTO invoices (order_id, invoice_number, invoice_path, invoice_date) VALUES (?, ?, ?, ?)',
            [orderId, invoiceNumber, relativePath, invoiceDateStr]
        );

        console.log(`💾 Invoice ${invoiceNumber} saved to database`);

        // 7. Dispatch Email with Attached PDF
        const emailRecipient = customer.email || 'ashmitha048@gmail.com';
        try {
            await sendInvoiceEmail(
                emailRecipient,
                customer.name || 'Customer',
                order.order_number,
                invoiceNumber,
                pdfPath
            );
            console.log(`📧 Invoice email sent successfully to ${emailRecipient}`);
        } catch (emailErr) {
            // Log it but do not crash the endpoint, ensuring the order goes through successfully
            console.error(`❌ Invoice email dispatch failed for order ${orderId}:`, emailErr.message);
        }

        return {
            order_id: orderId,
            invoice_number: invoiceNumber,
            invoice_path: relativePath,
            invoice_date: invoiceDateStr
        };
    },

    /**
     * Fetch invoice record by order ID
     * @param {string} orderId Order UUID
     * @returns {Promise<Object|null>} Invoice record or null
     */
    getInvoiceByOrderId: async (orderId) => {
        const [rows] = await db.query('SELECT * FROM invoices WHERE order_id = ?', [orderId]);
        return rows[0] || null;
    }
};

module.exports = invoiceService;
