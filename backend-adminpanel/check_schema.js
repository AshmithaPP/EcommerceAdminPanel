const db = require('./src/config/database');

async function checkSchema() {
    try {
        const tables = ['images', 'product_images', 'variant_images', 'product_variant_images'];
        for (const table of tables) {
            console.log(`\n--- Table: ${table} ---`);
            try {
                const [cols] = await db.query(`DESCRIBE ${table}`);
                console.table(cols);
            } catch (e) {
                console.log(`Table ${table} does not exist.`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
