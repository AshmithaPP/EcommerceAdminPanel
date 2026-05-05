const db = require('./src/config/database');

const createAddressTable = async () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS addresses (
            address_id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            phone VARCHAR(15) NOT NULL,
            email VARCHAR(100),
            address_line1 TEXT NOT NULL,
            address_line2 TEXT,
            landmark VARCHAR(100),
            city VARCHAR(50) NOT NULL,
            state VARCHAR(50) NOT NULL,
            postal_code VARCHAR(10) NOT NULL,
            country VARCHAR(50) NOT NULL DEFAULT 'India',
            address_type ENUM('home', 'work', 'other') DEFAULT 'home',
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `;

    try {
        await db.query(sql);
        console.log('✅ Address table created or already exists');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating address table:', err);
        process.exit(1);
    }
};

createAddressTable();
