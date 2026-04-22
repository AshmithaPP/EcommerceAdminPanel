const db = require('./src/config/database');

async function migrate() {
    console.log('Starting Analytics Migration (v2)...');
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create daily_stats table
        console.log('Creating daily_stats table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS daily_stats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE UNIQUE NOT NULL,
                total_orders INT DEFAULT 0,
                total_revenue DECIMAL(12, 2) DEFAULT 0.00,
                total_items_sold INT DEFAULT 0,
                total_discount DECIMAL(12, 2) DEFAULT 0.00,
                total_refunds DECIMAL(12, 2) DEFAULT 0.00,
                new_customers INT DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (date)
            ) ENGINE=InnoDB;
        `);

        // 2. Add cost_price to product_variants
        console.log('Adding cost_price to product_variants...');
        try {
            await connection.query(`
                ALTER TABLE product_variants 
                ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT 0.00 AFTER price;
            `);
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('Column cost_price already exists.');
            } else {
                throw err;
            }
        }

        await connection.commit();
        console.log('✅ Analytics migration completed successfully.');
        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error('❌ Analytics migration failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
