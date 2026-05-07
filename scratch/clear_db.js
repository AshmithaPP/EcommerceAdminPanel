const db = require('./backend-adminpanel/src/config/database');

async function clearTestData() {
    console.log('🚀 Starting database cleanup...');
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Disable foreign key checks for a clean wipe
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('🗑️ Clearing order items...');
        await connection.query('TRUNCATE TABLE order_items');

        console.log('🗑️ Clearing order timeline...');
        await connection.query('TRUNCATE TABLE order_timeline');

        console.log('🗑️ Clearing payment records...');
        await connection.query('TRUNCATE TABLE payments');

        console.log('🗑️ Clearing orders...');
        await connection.query('TRUNCATE TABLE orders');

        // 2. Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        await connection.commit();
        console.log('✅ Database cleared successfully! Analytics will reset on next dashboard load.');
    } catch (error) {
        await connection.rollback();
        console.error('❌ Cleanup failed:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

clearTestData();
