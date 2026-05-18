const db = require('./src/config/database');

async function main() {
    try {
        console.log('🏁 Starting DB migration for RBAC...');

        // 1. Modify users.role column
        await db.query(`
            ALTER TABLE users 
            MODIFY COLUMN role enum('superadmin', 'subadmin', 'admin', 'user') DEFAULT 'user'
        `);
        console.log('✅ Altered user role column enum successfully.');

        // 2. Add permissions column
        try {
            await db.query(`
                ALTER TABLE users 
                ADD COLUMN permissions JSON DEFAULT NULL
            `);
            console.log('✅ Added permissions JSON column successfully.');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ️ permissions column already exists.');
            } else {
                throw err;
            }
        }

        // 3. Promote Ashmitha to superadmin
        await db.query(`
            UPDATE users 
            SET role = 'superadmin' 
            WHERE email = 'ashmitha@example.com' OR role = 'admin'
        `);
        console.log('✅ Promoted Ashmitha to superadmin.');

        console.log('🎉 DB Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        process.exit();
    }
}

main();
