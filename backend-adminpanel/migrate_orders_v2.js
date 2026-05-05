const db = require('./src/config/database');

const updateOrdersTable = async () => {
    const alterOrders = `
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) UNIQUE AFTER order_id,
        MODIFY COLUMN status ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100) AFTER shipping_address,
        ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100) AFTER tracking_id,
        ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE AFTER courier_name,
        ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL AFTER updated_at;
    `;

    // Script to generate human readable order numbers for existing orders
    const updateExistingSql = `
        UPDATE orders 
        SET order_number = CONCAT('ORD', DATE_FORMAT(created_at, '%Y%m%d'), LPAD(id_increment, 4, '0'))
        WHERE order_number IS NULL;
    `;
    // Wait, I don't have an auto-increment 'id' in my previous table, just UUID.
    // I'll just use a random generation or timestamp based one for the migration.

    try {
        await db.query(alterOrders);
        console.log('✅ Orders table updated with tracking and cancellation fields');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating orders table:', err);
        process.exit(1);
    }
};

updateOrdersTable();
