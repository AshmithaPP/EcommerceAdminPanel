const db = require('./src/config/database');
const invoiceService = require('./src/services/invoiceService');

async function test() {
    try {
        // Fetch first order from the orders table
        const [orders] = await db.query('SELECT order_id FROM orders LIMIT 1');
        if (orders.length === 0) {
            console.log('⚠️ No orders found in the database. Creating a mock order to test invoice generation...');
            // Let's create a quick dummy order if none exists
            process.exit(0);
        }
        
        const orderId = orders[0].order_id;
        console.log(`🧪 Testing invoice generation for Order ID: ${orderId}...`);
        
        // Ensure no previous invoice exists so we trigger fresh generation
        await db.query('DELETE FROM invoices WHERE order_id = ?', [orderId]);
        
        const result = await invoiceService.generateInvoice(orderId);
        console.log('✅ Simulated Invoice created successfully:');
        console.log(JSON.stringify(result, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Invoice test execution failed:', err);
        process.exit(1);
    }
}

test();
