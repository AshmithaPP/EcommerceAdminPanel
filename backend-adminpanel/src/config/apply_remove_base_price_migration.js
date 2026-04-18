const fs = require('fs');
const path = require('path');
const db = require('./database');

async function applyMigration() {
    console.log('⏳ Applying Remove base_price Migration...');
    
    try {
        const sqlPath = path.join(__dirname, 'migrations', 'migration_v3_remove_base_price.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split SQL into individual statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        console.log(`✅ SQL File Loaded. Found ${statements.length} statements.`);

        const connection = await db.getConnection();
        console.log('✅ MySQL Database Connected Successfully');

        for (const statement of statements) {
            try {
                await connection.query(statement);
                console.log(`✅ Success: ${statement.substring(0, 50)}...`);
            } catch (err) {
                console.error(`❌ Error executing statement: ${statement}`);
                console.error(err.message);
                // Continue if column already dropped (idempotent-ish)
                if (!err.message.includes("Can't DROP 'base_price'")) {
                    throw err;
                }
            }
        }

        connection.release();
        console.log('✨ Migration Completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
}

applyMigration();
