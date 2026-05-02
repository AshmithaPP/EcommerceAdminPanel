const db = require('./src/config/database');

async function checkProduct() {
    try {
        const [rows] = await db.query('SELECT * FROM products LIMIT 1');
        console.log('Raw Product Data:', JSON.stringify(rows[0], null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkProduct();
