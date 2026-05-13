const db = require('./src/config/database');
async function check() {
    try {
        const [rows] = await db.query('SELECT * FROM settings');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
