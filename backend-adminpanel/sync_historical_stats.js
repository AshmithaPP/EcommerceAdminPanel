const analyticsService = require('./src/services/analyticsService');
const db = require('./src/config/database');

async function sync() {
    console.log('🚀 Starting Historical Analytics Sync...');
    
    try {
        // 1. Get all unique dates from orders table
        const [dates] = await db.query(`
            SELECT DISTINCT DATE(created_at) as order_date 
            FROM orders 
            ORDER BY order_date ASC
        `);

        if (dates.length === 0) {
            console.log('No orders found to sync.');
            process.exit(0);
        }

        console.log(`Found ${dates.length} days with orders. Syncing...`);

        for (const row of dates) {
            const dateStr = row.order_date.toISOString().split('T')[0];
            console.log(`Syncing ${dateStr}...`);
            await analyticsService.updateDailyStats(dateStr);
        }

        console.log('✅ Historical sync completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Historical sync failed:', error);
        process.exit(1);
    }
}

sync();
