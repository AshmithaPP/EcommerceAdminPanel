const db = require('./src/config/database');

async function migrate() {
    try {
        console.log('Adding GST columns to orders table...');
        const columns = [
            'ADD COLUMN gst_rate DECIMAL(5,2) DEFAULT 0 AFTER coupon_id',
            'ADD COLUMN gst_amount DECIMAL(10,2) DEFAULT 0 AFTER gst_rate',
            'ADD COLUMN cgst_amount DECIMAL(10,2) DEFAULT 0 AFTER gst_amount',
            'ADD COLUMN sgst_amount DECIMAL(10,2) DEFAULT 0 AFTER cgst_amount',
            'ADD COLUMN igst_amount DECIMAL(10,2) DEFAULT 0 AFTER sgst_amount',
            'ADD COLUMN amount_without_gst DECIMAL(10,2) DEFAULT 0 AFTER igst_amount',
            'ADD COLUMN amount_with_gst DECIMAL(10,2) DEFAULT 0 AFTER amount_without_gst'
        ];

        for (const col of columns) {
            try {
                await db.query(`ALTER TABLE orders ${col}`);
                console.log(`- Success: ${col.split(' ')[2]}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`- Already exists: ${col.split(' ')[2]}`);
                } else {
                    throw err;
                }
            }
        }
        console.log('Migration completed!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
