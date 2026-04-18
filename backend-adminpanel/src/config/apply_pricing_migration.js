const db = require('./database');
const fs = require('fs');
const path = require('path');

const applyMigration = async () => {
    try {
        console.log('⏳ Applying Pricing & GST Migration...');

        const migrationPath = path.join(__dirname, 'migrations', 'migration_v2_pricing.sql');
        const schemaFile = fs.readFileSync(migrationPath, 'utf8');

        // Split the SQL commands (basic split by semicolon)
        const commands = schemaFile.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);

        for (let command of commands) {
            try {
                await db.query(command);
                console.log(`✅ Success: ${command.substring(0, 50)}...`);
            } catch (cmdError) {
                console.warn(`⚠️ Warning on command: ${command.substring(0, 50)}...`);
                console.warn(`Detail: ${cmdError.message}`);
            }
        }

        console.log('✨ Migration Completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error.message);
        process.exit(1);
    }
};

applyMigration();
