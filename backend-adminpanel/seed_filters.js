const db = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

async function seedFilters() {
    try {
        console.log('Seeding dynamic filters...');

        // 1. Create Attributes
        const attrs = [
            { name: 'Color', id: uuidv4() },
            { name: 'Pattern', id: uuidv4() },
            { name: 'Occasion', id: uuidv4() },
            { name: 'Fabric', id: uuidv4() }
        ];

        for (const attr of attrs) {
            // Use INSERT IGNORE or check existence
            await db.query('INSERT IGNORE INTO attributes (attribute_id, name, status) VALUES (?, ?, 1)', [attr.id, attr.name]);
        }

        // Get actual IDs from DB (in case they already existed)
        const [rows] = await db.query('SELECT * FROM attributes');
        const attrMap = {};
        rows.forEach(r => attrMap[r.name] = r.attribute_id);

        // 2. Create Values
        const values = {
            'Color': ['Red', 'Pink', 'Gold', 'Green', 'Blue', 'Yellow', 'Black', 'Purple'],
            'Pattern': ['Floral', 'Temple Border', 'Zari Rich', 'Butta Work', 'Checked', 'Plain'],
            'Occasion': ['Wedding', 'Engagement', 'Festival', 'Party', 'Casual'],
            'Fabric': ['Pure Silk', 'Soft Silk', 'Cotton Silk', 'Kanchipuram Silk', 'Art Silk']
        };

        for (const [name, vals] of Object.entries(values)) {
            const attrId = attrMap[name];
            for (const val of vals) {
                await db.query('INSERT IGNORE INTO attribute_values (attribute_value_id, attribute_id, value, status) VALUES (?, ?, ?, 1)', [uuidv4(), attrId, val]);
            }
        }

        console.log('✅ Filters seeded successfully!');
        
        // 3. (Optional) Assign some attributes to existing products if needed
        const [products] = await db.query('SELECT product_id FROM products LIMIT 10');
        const [allVals] = await db.query('SELECT * FROM attribute_values');

        if (products.length > 0 && allVals.length > 0) {
            console.log('Assigning random filters to products for demo...');
            for (const p of products) {
                // Assign 2 random values
                const randomVals = allVals.sort(() => 0.5 - Math.random()).slice(0, 3);
                for (const rv of randomVals) {
                    await db.query('INSERT IGNORE INTO product_attribute_values (id, product_id, attribute_id, attribute_value_id) VALUES (?, ?, ?, ?)', 
                        [uuidv4(), p.product_id, rv.attribute_id, rv.attribute_value_id]);
                }
            }
        }

    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        process.exit();
    }
}

seedFilters();
