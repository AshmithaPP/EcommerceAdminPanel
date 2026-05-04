const db = require('../config/database');

const Blog = {
    create: async (blogData) => {
        const { title, subtitle, content, author, date, image, category } = blogData;
        const sql = `
            INSERT INTO blogs (title, subtitle, content, author, date, image, category)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [title, subtitle, content, author, date, image, category]);
        return result.insertId;
    },

    findAll: async () => {
        const sql = 'SELECT * FROM blogs ORDER BY created_at DESC';
        const [rows] = await db.query(sql);
        return rows;
    },

    findById: async (id) => {
        const sql = 'SELECT * FROM blogs WHERE id = ?';
        const [rows] = await db.query(sql, [id]);
        return rows[0];
    },

    update: async (id, blogData) => {
        const { title, subtitle, content, author, date, image, category } = blogData;
        const sql = `
            UPDATE blogs 
            SET title = ?, subtitle = ?, content = ?, author = ?, date = ?, image = ?, category = ?
            WHERE id = ?
        `;
        await db.query(sql, [title, subtitle, content, author, date, image, category, id]);
    },

    delete: async (id) => {
        const sql = 'DELETE FROM blogs WHERE id = ?';
        await db.query(sql, [id]);
    }
};

module.exports = Blog;
