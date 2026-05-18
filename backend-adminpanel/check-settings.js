const db = require('./src/config/database');

async function check() {
    try {
        const [rows] = await db.query("SELECT * FROM settings");
        console.log("--- MySQL settings table contents (Detailed) ---");
        rows.forEach(r => {
            console.log(`Key: ${r.settings_key}`);
            console.log(`Value:`, JSON.stringify(r.value, null, 2));
            console.log("----------------------------------");
        });
        process.exit(0);
    } catch(err) {
        console.error("Error checking settings:", err);
        process.exit(1);
    }
}

check();
