const db = require('./src/config/database');

async function checkSettings() {
    try {
        const [rows] = await db.query('SELECT * FROM settings');
        console.log('Settings:', rows);
        
        const [columns] = await db.query('SHOW COLUMNS FROM orders');
        console.log('Orders Columns:', columns.map(c => c.Field));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkSettings();
