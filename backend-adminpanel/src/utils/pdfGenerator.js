const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Formats a Date object or string into DD-MM-YYYY format
 */
const formatDate = (dateInput) => {
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-IN');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (e) {
        return new Date().toLocaleDateString('en-IN');
    }
};

/**
 * Generates a high-fidelity Flipkart-style dynamic invoice PDF
 * @param {Object} order The complete order object
 * @param {Object} customer Customer details (name, email, phone)
 * @param {string} invoiceNumber The generated invoice number
 * @param {string} invoiceDate Date of invoice generation
 * @returns {Promise<string>} The absolute path to the generated PDF file
 */
const generateInvoicePDF = (order, customer, invoiceNumber, invoiceDate) => {
    return new Promise((resolve, reject) => {
        try {
            // Ensure directory exists
            const invoicesDir = path.join(__dirname, '..', '..', 'uploads', 'invoices');
            if (!fs.existsSync(invoicesDir)) {
                fs.mkdirSync(invoicesDir, { recursive: true });
            }

            const fileName = `${invoiceNumber}.pdf`;
            const filePath = path.join(invoicesDir, fileName);

            // Create A4 document with small margins for highly dense dense structure (Flipkart-style)
            const doc = new PDFDocument({ size: 'A4', margin: 30 });
            const writeStream = fs.createWriteStream(filePath);

            doc.pipe(writeStream);

            const startX = 35;
            const endX = 560;
            const width = endX - startX;

            // ==================== Header Title ====================
            doc.fillColor('#000000')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text('Tax Invoice', startX, 35, { align: 'center' });

            // ==================== Sold By & Invoice Meta Info ====================
            let topY = 55;
            
            // Left Column: Sold By info
            doc.fontSize(8.5)
               .font('Helvetica-Bold')
               .text('Sold By: ', startX, topY)
               .font('Helvetica-Bold')
               .fillColor('#1e293b')
               .text('SAREE ECOM PRIVATE LIMITED', startX + 45, topY);

            doc.font('Helvetica')
               .fontSize(7.5)
               .fillColor('#475569')
               .text('Warehouse Address: 123, Silk Bazaar Road, Kanchipuram, Tamil Nadu - 631501, India', startX, topY + 12, { width: 280 })
               .text('State: Tamil Nadu', startX, topY + 34)
               .text('GSTIN: 33AAAAA1111A1Z1', startX, topY + 44)
               .text('PAN: AAHCD7974K', startX, topY + 54);

            // Right Column: Invoice Details info
            const rightColX = 350;
            doc.fillColor('#000000')
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text('Invoice Number: ', rightColX, topY)
               .font('Helvetica')
               .text(invoiceNumber, rightColX + 75, topY);

            doc.fontSize(7.5)
               .fillColor('#475569')
               .text('Nature of Transaction: Intra-State Sale / Inter-State Sale', rightColX, topY + 12)
               .text('Mode of Supply: E-Commerce Service Provider', rightColX, topY + 22);

            // Thick line below Sold By
            const lineY = topY + 70;
            doc.strokeColor('#000000')
               .lineWidth(1)
               .moveTo(startX, lineY)
               .lineTo(endX, lineY)
               .stroke();

            // ==================== Order, Bill To & Ship To Details ====================
            const detailY = lineY + 10;
            
            // 1. Order Details
            doc.fillColor('#000000')
               .fontSize(8)
               .font('Helvetica-Bold')
               .text(`Order ID:`, startX, detailY)
               .font('Helvetica')
               .text(order.order_number, startX, detailY + 12)
               .font('Helvetica-Bold')
               .text(`Order Date:`, startX, detailY + 26)
               .font('Helvetica')
               .text(formatDate(order.created_at), startX, detailY + 36)
               .font('Helvetica-Bold')
               .text(`Invoice Date:`, startX, detailY + 50)
               .font('Helvetica')
               .text(formatDate(invoiceDate), startX, detailY + 60);

            // Address Parsing
            const addr = typeof order.shipping_address === 'string' 
                ? JSON.parse(order.shipping_address) 
                : order.shipping_address;

            const customerName = addr?.name || customer?.name || 'Valued Customer';
            const customerPhone = addr?.phone || customer?.phone || 'N/A';
            const customerEmail = addr?.email || customer?.email || 'N/A';
            const addressLine1 = addr?.address_line1 || '';
            const addressLine2 = addr?.address_line2 ? `, ${addr.address_line2}` : '';
            const city = addr?.city ? `, ${addr.city}` : '';
            const state = addr?.state ? `, ${addr.state}` : '';
            const zip = addr?.zip_code ? ` - ${addr.zip_code}` : '';
            const fullAddress = `${addressLine1}${addressLine2}${city}${state}${zip}`;

            // 2. Bill To
            const billToX = startX + 175;
            doc.font('Helvetica-Bold')
               .text('Bill To:', billToX, detailY)
               .font('Helvetica')
               .text(customerName, billToX, detailY + 12)
               .text(fullAddress, billToX, detailY + 22, { width: 150 })
               .font('Helvetica-Bold')
               .text(`Phone: `, billToX, detailY + 62)
               .font('Helvetica')
               .text(customerPhone, billToX + 35, detailY + 62);

            // 3. Ship To
            const shipToX = startX + 350;
            doc.font('Helvetica-Bold')
               .text('Ship To:', shipToX, detailY)
               .font('Helvetica')
               .text(customerName, shipToX, detailY + 12)
               .text(fullAddress, shipToX, detailY + 22, { width: 150 })
               .font('Helvetica-Bold')
               .text(`Phone: `, shipToX, detailY + 62)
               .font('Helvetica')
               .text(customerPhone, shipToX + 35, detailY + 62);

            // Border Line below details
            const tableTop = detailY + 80;
            doc.strokeColor('#000000')
               .lineWidth(1)
               .moveTo(startX, tableTop)
               .lineTo(endX, tableTop)
               .stroke();

            // ==================== Product Table Headers ====================
            // Perfectly spaced column boundaries to prevent overlapping or wrapping
            const colProductX = startX + 5;
            const colQtyX = startX + 195;
            const colGrossX = startX + 225;
            const colDiscountX = startX + 285;
            const colTaxableX = startX + 340;
            const colTaxX = startX + 405;
            const colTotalX = startX + 465;

            // Header Background Row (Flipkart-style light background)
            doc.rect(startX, tableTop, width, 18)
               .fill('#f8fafc');

            const isIGST = parseFloat(order.igst_amount || 0) > 0;
            const taxHeaderLabel = isIGST ? 'IGST' : 'CGST+SGST';

            doc.fillColor('#000000')
               .fontSize(7.5)
               .font('Helvetica-Bold')
               .text('Product Details', colProductX, tableTop + 5)
               .text('Qty', colQtyX, tableTop + 5, { align: 'center', width: 25 })
               .text('Gross (Rs.)', colGrossX, tableTop + 5, { align: 'right', width: 55 })
               .text('Discount (Rs.)', colDiscountX, tableTop + 5, { align: 'right', width: 50 })
               .text('Taxable (Rs.)', colTaxableX, tableTop + 5, { align: 'right', width: 60 })
               .text(`${taxHeaderLabel} (Rs.)`, colTaxX, tableTop + 5, { align: 'right', width: 55 })
               .text('Total (Rs.)', colTotalX, tableTop + 5, { align: 'right', width: 60 });

            // Horizontal thin border
            doc.strokeColor('#94a3b8')
               .lineWidth(0.5)
               .moveTo(startX, tableTop + 18)
               .lineTo(endX, tableTop + 18)
               .stroke();

            // ==================== Product Table Body ====================
            let currentY = tableTop + 18;
            const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

            // Formulate complete items list (including Shipping Charge formatted as separate product like Flipkart!)
            const itemsList = [...(orderItems || [])];
            
            if (parseFloat(order.delivery_fee || 0) > 0) {
                itemsList.push({
                    product_id: 'SHIPPING',
                    variant_id: null,
                    quantity: 1,
                    price: parseFloat(order.delivery_fee),
                    name: 'Shipping & Delivery Charges',
                    variant_sku: 'SHIPPING_FEE',
                    is_shipping: true
                });
            }

            itemsList.forEach((item, index) => {
                const itemHeight = 35;
                const price = parseFloat(item.price || 0);
                const qty = parseInt(item.quantity || 1);
                
                const lineGross = price * qty;
                
                // Calculate item-level discount allocation
                // If it is regular item, we can allocate proportion of coupon discount
                let lineDiscount = 0;
                if (!item.is_shipping && parseFloat(order.discount || 0) > 0) {
                    const regularItemsCount = (orderItems || []).length;
                    lineDiscount = parseFloat((parseFloat(order.discount) / regularItemsCount).toFixed(2));
                }

                const lineTaxable = Math.max(0, lineGross - lineDiscount);
                
                // Calculate item-level GST allocation
                const gstRate = parseFloat(order.gst_rate || 5);
                const lineTax = parseFloat((lineTaxable * (gstRate / (100 + gstRate))).toFixed(2));
                const lineBaseTaxable = parseFloat((lineTaxable - lineTax).toFixed(2));
                const lineTotal = lineTaxable;

                // Draw row thin bottom boundary
                doc.strokeColor('#e2e8f0')
                   .lineWidth(0.5)
                   .moveTo(startX, currentY + itemHeight)
                   .lineTo(endX, currentY + itemHeight)
                   .stroke();

                // 1. Description & SKU
                doc.fillColor('#000000')
                   .fontSize(7.5)
                   .font('Helvetica-Bold')
                   .text(item.name || item.product_name, colProductX, currentY + 6, { width: 185, height: 16, ellipsis: true });

                const codeLabel = item.is_shipping ? 'SAC: 996511' : `HSN/SKU: ${item.variant_sku || 'N/A'}`;
                const gstLabel = item.is_shipping ? 'GST: 18.0%' : `GST: ${gstRate.toFixed(1)}%`;

                doc.fontSize(6.5)
                   .font('Helvetica')
                   .fillColor('#64748b')
                   .text(`${codeLabel} | ${gstLabel}`, colProductX, currentY + 22);

                // 2. Qty
                doc.fontSize(7.5)
                   .font('Helvetica')
                   .fillColor('#000000')
                   .text(String(qty), colQtyX, currentY + 12, { align: 'center', width: 25 });

                // 3. Gross Amt
                doc.text(lineGross.toFixed(2), colGrossX, currentY + 12, { align: 'right', width: 55 });

                // 4. Discount
                doc.text(lineDiscount > 0 ? `-${lineDiscount.toFixed(2)}` : '0.00', colDiscountX, currentY + 12, { align: 'right', width: 50 });

                // 5. Taxable Val
                doc.text(lineBaseTaxable.toFixed(2), colTaxableX, currentY + 12, { align: 'right', width: 60 });

                // 6. Tax
                doc.text(lineTax.toFixed(2), colTaxX, currentY + 12, { align: 'right', width: 55 });

                // 7. Line Total
                doc.font('Helvetica-Bold')
                   .text(lineTotal.toFixed(2), colTotalX, currentY + 12, { align: 'right', width: 60 });

                currentY += itemHeight;
            });

            // ==================== Total Summary Row ====================
            const totalsHeight = 22;
            doc.strokeColor('#000000')
               .lineWidth(1)
               .moveTo(startX, currentY + totalsHeight)
               .lineTo(endX, currentY + totalsHeight)
               .stroke();

            // Totals Row Background
            doc.rect(startX, currentY, width, totalsHeight)
               .fill('#f8fafc');

            const totalQty = itemsList.reduce((sum, item) => sum + parseInt(item.quantity || 1), 0);
            
            // Format total metrics
            const totalGross = parseFloat(order.subtotal) + parseFloat(order.delivery_fee || 0);
            const totalDiscount = parseFloat(order.discount || 0);
            const totalTaxable = parseFloat(order.amount_without_gst || 0);
            const totalTax = parseFloat(order.gst_amount || 0);
            const totalGrand = parseFloat(order.total_amount || 0);

            doc.fillColor('#000000')
               .fontSize(8)
               .font('Helvetica-Bold')
               .text('Total', colProductX, currentY + 7)
               .text(String(totalQty), colQtyX, currentY + 7, { align: 'center', width: 25 })
               .text(totalGross.toFixed(2), colGrossX, currentY + 7, { align: 'right', width: 55 })
               .text(totalDiscount > 0 ? `-${totalDiscount.toFixed(2)}` : '0.00', colDiscountX, currentY + 7, { align: 'right', width: 50 })
               .text(totalTaxable.toFixed(2), colTaxableX, currentY + 7, { align: 'right', width: 60 })
               .text(totalTax.toFixed(2), colTaxX, currentY + 7, { align: 'right', width: 55 })
               .text(totalGrand.toFixed(2), colTotalX, currentY + 7, { align: 'right', width: 60 });

            currentY += totalsHeight;

            // ==================== Grand Total Banner (Flipkart-Style) ====================
            const grandTotalY = currentY + 20;
            doc.fillColor('#000000')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text(`Grand Total`, startX + 300, grandTotalY)
               .fontSize(13)
               .text(`Rs. ${totalGrand.toFixed(2)}`, startX + 430, grandTotalY - 1, { align: 'right', width: 95 });

            // ==================== Payment Meta & Signatures ====================
            const paymentTop = grandTotalY + 45;

            // Left Block: Payment Info
            doc.strokeColor('#e2e8f0')
               .lineWidth(0.5)
               .rect(startX, paymentTop, 220, 65)
               .stroke();

            doc.fillColor('#000000')
               .fontSize(7.5)
               .font('Helvetica-Bold')
               .text('Payment Information', startX + 10, paymentTop + 8)
               .font('Helvetica')
               .text(`Method: ${order.payment_method?.toUpperCase() || 'COD'}`, startX + 10, paymentTop + 22)
               .text(`Status: ${order.payment_status || 'Pending'}`, startX + 10, paymentTop + 34)
               .text(`Transaction ID: ${order.transaction_id || 'N/A'}`, startX + 10, paymentTop + 46);

            // Right Block: "This is computer generated" (Just like Flipkart)
            const stampX = startX + 260;
            doc.strokeColor('#e2e8f0')
               .lineWidth(0.5)
               .rect(stampX, paymentTop, 265, 65)
               .stroke();

            doc.fillColor('#64748b')
               .fontSize(7)
               .font('Helvetica-Oblique')
               .text('This is a computer generated invoice and does not require a physical signature.', stampX, paymentTop + 16, { align: 'center', width: 250 })
               .text('Keep this invoice safe for any warranty claims and product verification.', stampX, paymentTop + 36, { align: 'center', width: 250 });

            // ==================== Flipkart-style Returns Notice & Footer ====================
            const footerTop = 730;

            // Returns notice block
            doc.strokeColor('#000000')
               .lineWidth(0.5)
               .moveTo(startX, footerTop)
               .lineTo(endX, footerTop)
               .stroke();

            doc.fillColor('#1e293b')
               .fontSize(6.5)
               .font('Helvetica-Bold')
               .text('Returns Policy: ', startX, footerTop + 6)
               .font('Helvetica')
               .fillColor('#475569')
               .text('At SareeEcom we deliver perfectly crafted sarees. In the off-chance that you need to return, please do so with the original brand box/price tag, original packaging and this invoice copy. Return window is standard 7 days from delivery.', startX + 55, footerTop + 6, { width: 470 });

            // Registered Office
            doc.fillColor('#64748b')
               .fontSize(6)
               .text('Registered Office: SAREE ECOM PRIVATE LIMITED, 123, Silk Bazaar Road, Kanchipuram, Tamil Nadu - 631501, India.', startX, footerTop + 24, { align: 'center' })
               .font('Helvetica-Bold')
               .text('Contact SareeEcom Customer Support: 1800 200 9999 | support@sareeecom.com | www.sareeecom.com', startX, footerTop + 34, { align: 'center' });

            doc.end();

            writeStream.on('finish', () => {
                resolve(filePath);
            });

            writeStream.on('error', (err) => {
                reject(err);
            });
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    generateInvoicePDF
};
