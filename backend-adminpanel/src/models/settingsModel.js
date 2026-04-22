const db = require('../config/database');

const Settings = {
    getAll: async () => {
        const sql = 'SELECT settings_key, value FROM settings';
        const [rows] = await db.query(sql);
        
        // Transform array of [{settings_key, value}, ...] into a single object
        const settingsObj = {};
        rows.forEach(row => {
            settingsObj[row.settings_key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        });
        return settingsObj;
    },

    update: async (key, value) => {
        const sql = `
            INSERT INTO settings (settings_key, value) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE value = ?, updated_at = CURRENT_TIMESTAMP
        `;
        const jsonValue = JSON.stringify(value);
        await db.query(sql, [key, jsonValue, jsonValue]);
    }
};

module.exports = Settings;
