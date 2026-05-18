const db = require('./src/config/database');

async function check() {
    try {
        const [rows] = await db.query("DESCRIBE blogs");
        console.log("--- MySQL blogs table structure ---");
        rows.forEach(r => {
            console.log(`Field: ${r.Field} | Type: ${r.Type} | Null: ${r.Null}`);
        });
        process.exit(0);
    } catch(err) {
        console.error("Error describing blogs:", err);
        process.exit(1);
    }
}

check();
