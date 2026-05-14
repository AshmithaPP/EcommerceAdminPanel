const db = require('./src/config/database');

async function migrate() {
    try {
        console.log('🚀 Adding is_stock_deducted column to orders table...');
        await db.query(`
            ALTER TABLE orders 
            ADD COLUMN is_stock_deducted TINYINT(1) DEFAULT 0 AFTER payment_gateway
        `);
        console.log('✅ Migration successful!');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_COLUMN_NAME') {
            console.log('ℹ️ Column is_stock_deducted already exists.');
            process.exit(0);
        }
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
