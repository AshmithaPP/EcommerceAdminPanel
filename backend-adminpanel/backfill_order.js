const db = require('./src/config/database');

async function updateOrder(orderNumber) {
    try {
        const gstRate = 5; // From settings
        const subtotal = 19000;
        const discount = 3800;
        const totalAmount = 15200;
        
        // Calculate inclusive GST
        const amountWithoutGst = parseFloat((totalAmount / (1 + (gstRate / 100))).toFixed(2));
        const gstAmount = parseFloat((totalAmount - amountWithoutGst).toFixed(2));
        const cgstAmount = parseFloat((gstAmount / 2).toFixed(2));
        const sgstAmount = parseFloat((gstAmount - cgstAmount).toFixed(2));

        const sql = `
            UPDATE orders 
            SET gst_rate = ?, gst_amount = ?, cgst_amount = ?, sgst_amount = ?, 
                amount_without_gst = ?, amount_with_gst = ?
            WHERE order_number = ?
        `;
        await db.query(sql, [gstRate, gstAmount, cgstAmount, sgstAmount, amountWithoutGst, totalAmount, orderNumber]);
        console.log('Order updated successfully!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

updateOrder('ORD72439435488');
