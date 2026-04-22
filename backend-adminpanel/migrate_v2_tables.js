const db = require('./src/config/database');

async function migrate() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Creating media table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS media (
                media_id CHAR(36) PRIMARY KEY,
                url TEXT NOT NULL,
                hash CHAR(64) NOT NULL UNIQUE,
                thumbnail_url TEXT,
                mini_thumbnail_url TEXT,
                width INT,
                height INT,
                file_size INT,
                format VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);

        console.log('Creating product_media mapping...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS product_media (
                product_id CHAR(36) NOT NULL,
                media_id CHAR(36) NOT NULL,
                is_primary TINYINT(1) DEFAULT 0,
                sort_order INT DEFAULT 0,
                PRIMARY KEY (product_id, media_id),
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
                FOREIGN KEY (media_id) REFERENCES media(media_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        console.log('Creating variant_media mapping...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS variant_media (
                variant_id CHAR(36) NOT NULL,
                media_id CHAR(36) NOT NULL,
                is_primary TINYINT(1) DEFAULT 0,
                sort_order INT DEFAULT 0,
                PRIMARY KEY (variant_id, media_id),
                FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE,
                FOREIGN KEY (media_id) REFERENCES media(media_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        console.log('Creating attribute_media mapping...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS attribute_media (
                product_id CHAR(36) NOT NULL,
                attribute_id CHAR(36) NOT NULL,
                attribute_value_id CHAR(36) NOT NULL,
                media_id CHAR(36) NOT NULL,
                PRIMARY KEY (product_id, attribute_id, attribute_value_id, media_id),
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
                FOREIGN KEY (media_id) REFERENCES media(media_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        await connection.commit();
        console.log('✅ Media system tables created successfully.');
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
