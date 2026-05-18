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

        // Dynamic Self-Healing Seeding for blog_hero
        if (!settingsObj.blog_hero) {
            settingsObj.blog_hero = {
                over_title: "LEGACY OF THE LOOM",
                title: "Timeless Tradition Woven in Silk",
                subtitle: "Celebrating the heritage of authentic Kanchipuram silk sarees crafted by master weavers through generations of sacred geometry and golden threads.",
                button_text: "Explore Collections",
                image_url: "/uploads/blog_hero.png"
            };
            const seedSql = `
                INSERT IGNORE INTO settings (settings_key, value) 
                VALUES ('blog_hero', ?)
            `;
            await db.query(seedSql, [JSON.stringify(settingsObj.blog_hero)]).catch(e => {});
        }

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
