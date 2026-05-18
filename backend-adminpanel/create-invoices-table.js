const db = require('./src/config/database');

async function createTable() {
    try {
        const sql = `
            CREATE TABLE IF NOT EXISTS invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id CHAR(36) NOT NULL UNIQUE,
                invoice_number VARCHAR(50) NOT NULL UNIQUE,
                invoice_path VARCHAR(255) NOT NULL,
                invoice_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `;
        await db.query(sql);
        console.log('✅ Invoices table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating invoices table:', err);
        process.exit(1);
    }
}

createTable();
