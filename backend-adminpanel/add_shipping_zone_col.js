const db = require('./src/config/database');

async function addShippingZoneColumn() {
    try {
        console.log('Adding shipping_zone column to orders table...');
        const sql = `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zone VARCHAR(100) AFTER delivery_fee;`;
        // MySQL doesn't support IF NOT EXISTS for ADD COLUMN directly in standard SQL without procedural code, 
        // but I'll use the same trick as before.
        
        try {
            await db.query('ALTER TABLE orders ADD COLUMN shipping_zone VARCHAR(100) AFTER delivery_fee');
            console.log('✅ Success: shipping_zone added');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('✅ already exists: shipping_zone');
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

addShippingZoneColumn();
