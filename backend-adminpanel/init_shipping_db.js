const db = require('./src/config/database');

async function createShippingTable() {
    try {
        console.log('Creating shipping_zones table...');
        const sql = `
            CREATE TABLE IF NOT EXISTS shipping_zones (
                zone_id INT AUTO_INCREMENT PRIMARY KEY,
                zone_name VARCHAR(100) NOT NULL,
                states JSON NOT NULL,
                shipping_charge DECIMAL(10,2) DEFAULT 0,
                free_shipping_above DECIMAL(10,2) DEFAULT NULL,
                status BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `;
        await db.query(sql);
        
        // Seed some initial data
        const checkSql = 'SELECT COUNT(*) as count FROM shipping_zones';
        const [rows] = await db.query(checkSql);
        
        if (rows[0].count === 0) {
            console.log('Seeding initial shipping zones...');
            const seedSql = `
                INSERT INTO shipping_zones (zone_name, states, shipping_charge, free_shipping_above) 
                VALUES 
                ('Tamil Nadu Local', '["Tamil Nadu"]', 50.00, 2000.00),
                ('South India', '["Kerala", "Karnataka", "Andhra Pradesh", "Telangana"]', 80.00, 3000.00),
                ('Rest of India', '["Maharashtra", "Gujarat", "Delhi", "Rajasthan", "West Bengal", "Madhya Pradesh"]', 120.00, 5000.00);
            `;
            await db.query(seedSql);
        }

        console.log('Shipping zones table ready!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

createShippingTable();
