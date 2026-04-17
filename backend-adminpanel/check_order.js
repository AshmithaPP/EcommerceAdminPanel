const db = require('./src/config/database');

const checkOrder = async (orderId) => {
    try {
        const query = 'SELECT * FROM orders WHERE order_id = ?';
        const [rows] = await db.query(query, [orderId]);
        if (rows.length > 0) {
            console.log('✅ Order found:', rows[0].order_id);
        } else {
            console.log('❌ Order NOT found:', orderId);
        }
    } catch (error) {
        console.error('Database Error:', error);
    } finally {
        process.exit();
    }
};

checkOrder('a05adb03-8de1-479f-bd8e-7a640b2a22f2');
