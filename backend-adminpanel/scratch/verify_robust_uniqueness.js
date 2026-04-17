const db = require('../src/config/database');
const Product = require('../src/models/productModel');
const { v4: uuidv4 } = require('uuid');

async function testRobustUniqueness() {
    console.log('Testing Robust Uniqueness Check...');
    const slug = 'duplicate-test-' + Date.now();
    const productId = uuidv4();

    try {
        // 1. Create and soft-delete a product WITHOUT renaming (simulating old data)
        await db.query(`
            INSERT INTO products (product_id, name, slug, category_id, brand, base_price, status)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `, [productId, 'Old Product', slug, 'ca3c0f93-3617-4015-a0b9-dd6094399fa0', 'OldBrand', 100]);
        console.log('Created soft-deleted product with slug:', slug);

        // 2. Check if findBySlug finds it
        const found = await Product.findBySlug(slug);
        if (found) {
            console.log('SUCCESS: findBySlug found the soft-deleted product.');
        } else {
            console.log('FAILURE: findBySlug did NOT find the soft-deleted product.');
        }

        // 3. Clean up
        await db.query('DELETE FROM products WHERE product_id = ?', [productId]);
        console.log('Cleanup done.');

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit(0);
    }
}

testRobustUniqueness();
