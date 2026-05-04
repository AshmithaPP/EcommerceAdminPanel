const db = require('./database');
const fs = require('fs');
const path = require('path');

const migrateHomepage = async () => {
    try {
        console.log('⏳ Migrating Homepage Schema...');

        const homepageSchemaFile = fs.readFileSync(path.join(__dirname, 'homepage_schema.sql'), 'utf8');

        const commands = homepageSchemaFile
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0);

        for (let command of commands) {
            try {
                await db.query(command);
                console.log(`✅ Executed: ${command.substring(0, 50)}...`);
            } catch (cmdError) {
                if (cmdError.code === 'ER_DUP_KEYNAME' || cmdError.code === 'ER_TABLE_EXISTS_ERROR' || cmdError.code === 'ER_DUP_FIELDNAME') {
                    console.log(`⏩ Skipping: ${cmdError.message}`);
                } else {
                    console.warn(`⚠️ Error on command: ${command.substring(0, 50)}...`);
                    console.warn(`Detail: ${cmdError.message}`);
                }
            }
        }

        console.log('✅ Homepage Migration Completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Homepage Migration Failed:', error.message);
        process.exit(1);
    }
};

migrateHomepage();
