const db = require('./src/config/database');

async function addTrackingColumns() {
    try {
        console.log('📦 Verifying and adding tracking columns to orders table...');

        // 1. Check existing columns in orders table
        const [columns] = await db.query('SHOW COLUMNS FROM orders');
        const columnNames = columns.map(c => c.Field);

        // 2. Add tracking_url if missing
        if (!columnNames.includes('tracking_url')) {
            await db.query('ALTER TABLE orders ADD COLUMN tracking_url VARCHAR(255) NULL DEFAULT "https://www.stcourier.com/track/shipment"');
            console.log('✅ Column tracking_url added successfully!');
        } else {
            console.log('ℹ️ Column tracking_url already exists.');
        }

        // 3. Add shipment_status if missing
        if (!columnNames.includes('shipment_status')) {
            await db.query('ALTER TABLE orders ADD COLUMN shipment_status VARCHAR(50) DEFAULT "Pending"');
            console.log('✅ Column shipment_status added successfully!');
        } else {
            console.log('ℹ️ Column shipment_status already exists.');
        }

        // 4. Add shipped_at if missing
        if (!columnNames.includes('shipped_at')) {
            await db.query('ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMP NULL DEFAULT NULL');
            console.log('✅ Column shipped_at added successfully!');
        } else {
            console.log('ℹ️ Column shipped_at already exists.');
        }

        console.log('🚀 SUCCESS: orders table is fully prepared for manual courier tracking!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating database table:', err);
        process.exit(1);
    }
}

addTrackingColumns();
