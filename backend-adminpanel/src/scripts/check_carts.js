const db = require('../config/database');

async function checkCarts() {
    try {
        console.log('--- CARTS ---');
        const [carts] = await db.query('SELECT * FROM carts');
        console.table(carts);

        console.log('--- CART ITEMS ---');
        const [items] = await db.query(`
            SELECT ci.*, p.name 
            FROM cart_items ci 
            JOIN products p ON ci.product_id = p.product_id
        `);
        console.table(items);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkCarts();
