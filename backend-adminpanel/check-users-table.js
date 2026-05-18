const db = require('./src/config/database');

async function main() {
    try {
        const [rows] = await db.query('DESCRIBE users');
        console.log('📋 users table schema:');
        console.table(rows);
    } catch (err) {
        console.error('❌ Error describing users table:', err.message);
    } finally {
        process.exit();
    }
}

main();
