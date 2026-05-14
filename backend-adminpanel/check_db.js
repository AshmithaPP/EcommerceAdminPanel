const db = require('./src/config/database');

async function check() {
    try {
        const [products] = await db.query("SELECT product_id, name, slug FROM products WHERE name LIKE '%silk%'");
        console.log("Products matching 'silk':", products);
        
        const [variants] = await db.query("SELECT variant_id, product_id, sku FROM product_variants WHERE product_id IN (SELECT product_id FROM products WHERE name LIKE '%silk%')");
        console.log("Variants for these products:", variants);
        
        const [inventory] = await db.query("SELECT * FROM inventory_levels WHERE variant_id IN (SELECT variant_id FROM product_variants WHERE product_id IN (SELECT product_id FROM products WHERE name LIKE '%silk%'))");
        console.log("Inventory records:", inventory);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
