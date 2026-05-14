const db = require('./src/config/database');

async function checkOrder(orderNumber) {
    try {
        const [rows] = await db.query('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
        console.log('Order Data:', rows[0]);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkOrder('ORD72439435488');
