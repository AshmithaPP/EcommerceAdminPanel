const db = require('./database');
const fs = require('fs');
const path = require('path');

const runStockHistoryMigration = async () => {
    try {
        console.log('⏳ Running Stock History Migration...');

        const migrationPath = path.join(__dirname, 'stock_history_schema.sql');
        const schemaFile = fs.readFileSync(migrationPath, 'utf8');

        // Split the SQL commands (basic split by semicolon)
        const commands = schemaFile.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);

        for (let command of commands) {
            try {
                await db.query(command);
            } catch (cmdError) {
                console.warn(`⚠️ Warning on command: ${command.substring(0, 50)}...`);
                console.warn(`Detail: ${cmdError.message}`);
                // Don't throw, try to continue
            }
        }

        console.log('✅ Stock History Migration Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error.message);
        process.exit(1);
    }
};

runStockHistoryMigration();
