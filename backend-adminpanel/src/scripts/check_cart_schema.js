const db = require('../config/database');

async function checkSchema() {
    try {
        const [columns] = await db.query('DESCRIBE carts');
        console.log('--- CARTS SCHEMA ---');
        console.table(columns);

        const [itemsColumns] = await db.query('DESCRIBE cart_items');
        console.log('--- CART_ITEMS SCHEMA ---');
        console.table(itemsColumns);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
