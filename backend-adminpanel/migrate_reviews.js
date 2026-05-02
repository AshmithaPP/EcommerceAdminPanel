const db = require('./src/config/database');

async function migrate() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Creating product_reviews table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS product_reviews (
                review_id CHAR(36) PRIMARY KEY,
                product_id CHAR(36) NOT NULL,
                customer_id CHAR(36),
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_text TEXT,
                status TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        await connection.commit();
        console.log('✅ Product reviews table created successfully.');
        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
