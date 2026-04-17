const db = require('./database');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        // Add columns to variant_images
        console.log('Adding columns to variant_images...');
        try {
            await db.query(`
                ALTER TABLE variant_images 
                ADD COLUMN thumbnail_url TEXT AFTER image_url, 
                ADD COLUMN mini_thumbnail_url TEXT AFTER thumbnail_url
            `);
            console.log('variant_images updated.');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.log('Columns already exist in variant_images.');
            } else {
                throw e;
            }
        }

        // Add column to products
        console.log('Adding column to products...');
        try {
            await db.query(`
                ALTER TABLE products 
                ADD COLUMN video_url TEXT AFTER base_price
            `);
            console.log('products updated.');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.log('Column already exists in products.');
            } else {
                throw e;
            }
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
