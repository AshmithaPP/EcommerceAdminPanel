const nodemailer = require('nodemailer');

// Configure the SMTP transporter using Brevo
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports (like 587)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendLowStockEmail = async (productDetails) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'ashmitha048@gmail.com';
    
    // Formatting the email content
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #d9534f;">⚠️ Low Stock Alert</h2>
            <p>Hello Admin,</p>
            <p>The stock for the following product has reached or dropped below its low stock threshold:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                    <td style="padding: 10px; border: 1px solid #ddd;">${productDetails.product_name}</td>
                </tr>
                ${productDetails.variant_name ? `
                <tr>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Variant</th>
                    <td style="padding: 10px; border: 1px solid #ddd;">${productDetails.variant_name}</td>
                </tr>
                ` : ''}
                ${productDetails.variant_sku ? `
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">SKU</th>
                    <td style="padding: 10px; border: 1px solid #ddd;">${productDetails.variant_sku}</td>
                </tr>
                ` : ''}
                <tr>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #d9534f;">Current Quantity</th>
                    <td style="padding: 10px; border: 1px solid #ddd; color: #d9534f; font-weight: bold;">${productDetails.quantity}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Low Stock Limit</th>
                    <td style="padding: 10px; border: 1px solid #ddd;">${productDetails.low_stock_threshold || 'Not set'}</td>
                </tr>
            </table>
            
            <p>Please restock this item soon to avoid stockouts and missed sales.</p>
            <br/>
            <p style="font-size: 0.9em; color: #777;">This is an automated message from your E-commerce Admin Panel.</p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: '"SareeEcom System" <' + adminEmail + '>',
            to: adminEmail,
            subject: `⚠️ Low Stock Alert: ${productDetails.product_name}`,
            html: htmlContent,
        });

        console.log(`📧 Low stock email sent successfully for ${productDetails.product_name}. Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending low stock email:', error);
        return false;
    }
};

const sendInvoiceEmail = async (customerEmail, customerName, orderNumber, invoiceNumber, pdfPath) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'ashmitha048@gmail.com';
    
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 25px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">Thank You for Your Purchase!</h1>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Order Reference: ${orderNumber}</p>
            </div>
            
            <div style="padding: 25px; background-color: #ffffff;">
                <p style="font-size: 15px; margin-top: 0;">Dear <strong>${customerName}</strong>,</p>
                <p>Thank you for shopping with us! We are thrilled to let you know that your order has been received and is being processed.</p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 4px 0; font-weight: 600; color: #64748b;">Order Number:</td>
                            <td style="padding: 4px 0; font-weight: 700; color: #1e293b;">${orderNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; font-weight: 600; color: #64748b;">Invoice Number:</td>
                            <td style="padding: 4px 0; color: #1e293b;">${invoiceNumber}</td>
                        </tr>
                    </table>
                </div>
                
                <p>We have generated your formal purchase invoice. For your records, it has been attached directly to this email as a PDF file.</p>
                <p>If you have any questions, feel free to contact our customer support team at <a href="mailto:${adminEmail}" style="color: #3b82f6; text-decoration: none;">${adminEmail}</a>.</p>
                
                <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
                    <p style="margin: 0;">© ${new Date().getFullYear()} SareeEcom Store. All rights reserved.</p>
                </div>
            </div>
        </div>
    `;

    try {
        const fs = require('fs');
        const path = require('path');
        const attachments = [];
        if (fs.existsSync(pdfPath)) {
            attachments.push({
                filename: path.basename(pdfPath),
                path: pdfPath
            });
        }

        const info = await transporter.sendMail({
            from: '"SareeEcom Store" <' + adminEmail + '>',
            to: customerEmail,
            subject: `Your Order Invoice - ${orderNumber}`,
            html: htmlContent,
            attachments
        });

        console.log(`📧 Invoice email sent successfully to ${customerEmail}. Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending invoice email:', error);
        throw error;
    }
};

module.exports = {
    sendLowStockEmail,
    sendInvoiceEmail
};
