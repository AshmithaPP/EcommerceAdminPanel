const db = require('./src/config/database');

async function main() {
    try {
        const [rows] = await db.query('SELECT user_id, name, email, role, status FROM users');
        console.log('📋 Current users in DB:');
        console.table(rows);
    } catch (err) {
        console.error('❌ Error selecting users:', err.message);
    } finally {
        process.exit();
    }
}

main();
