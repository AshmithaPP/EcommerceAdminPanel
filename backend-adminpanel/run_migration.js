const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    console.log('Connecting to database:', process.env.DB_NAME);
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log('Adding meta_title column...');
        await connection.query('ALTER TABLE products ADD COLUMN meta_title VARCHAR(255) DEFAULT NULL');
    } catch (err) {
        if (err.errno === 1060) {
            console.log('meta_title already exists.');
        } else {
            console.error('Error adding meta_title:', err);
        }
    }

    try {
        console.log('Adding meta_description column...');
        await connection.query('ALTER TABLE products ADD COLUMN meta_description TEXT DEFAULT NULL');
    } catch (err) {
        if (err.errno === 1060) {
            console.log('meta_description already exists.');
        } else {
            console.error('Error adding meta_description:', err);
        }
    }
 finally {
        await connection.end();
        process.exit(0);
    }
}

migrate();
