const db = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
    console.log('Starting migration...');
    const connection = await db.getConnection();
    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
        
        // 1. Update sub_category_attributes
        try {
            console.log('Adding is_variant_attribute to sub_category_attributes...');
            await connection.query('ALTER TABLE sub_category_attributes ADD COLUMN is_variant_attribute TINYINT(1) DEFAULT 0 AFTER attribute_id;');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('Column is_variant_attribute already exists in sub_category_attributes.');
            } else {
                throw err;
            }
        }

        // 2. Update category_attributes
        try {
            console.log('Adding is_variant_attribute to category_attributes...');
            await connection.query('ALTER TABLE category_attributes ADD COLUMN is_variant_attribute TINYINT(1) DEFAULT 0 AFTER attribute_id;');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('Column is_variant_attribute already exists in category_attributes.');
            } else {
                throw err;
            }
        }

        // 3. Update products
        try {
            console.log('Adding base_sku and variant_config to products...');
            await connection.query('ALTER TABLE products ADD COLUMN base_sku VARCHAR(100) NULL AFTER slug;');
            await connection.query('ALTER TABLE products ADD COLUMN variant_config JSON NULL AFTER base_sku;');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('One or more columns already exist in products.');
            } else {
                throw err;
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
