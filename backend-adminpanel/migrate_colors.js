const db = require('./src/config/database');

async function migrate() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Checking attribute_values table for color columns...');
        
        const [columns] = await connection.query('SHOW COLUMNS FROM attribute_values');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('color_code')) {
            console.log('Adding color_code column...');
            await connection.query('ALTER TABLE attribute_values ADD COLUMN color_code VARCHAR(7) DEFAULT NULL');
        }

        if (!columnNames.includes('swatch_image')) {
            console.log('Adding swatch_image column...');
            await connection.query('ALTER TABLE attribute_values ADD COLUMN swatch_image TEXT DEFAULT NULL');
        }

        await connection.commit();
        console.log('✅ Attribute values table updated successfully.');
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
