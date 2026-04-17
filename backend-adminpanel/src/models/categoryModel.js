const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Category = {
    create: async (categoryData, createdBy) => {
        const { name, parent_category_id, display_order } = categoryData;
        const categoryId = uuidv4();
        
        await db.query(
            'INSERT INTO categories (category_id, name, parent_category_id, display_order, created_by) VALUES (?, ?, ?, ?, ?)',
            [categoryId, name, parent_category_id || null, display_order || 0, createdBy]
        );
        
        return { category_id: categoryId, name, parent_category_id, display_order };
    },

    getAll: async (limit = 10, offset = 0) => {
        const [rows] = await db.query(
            'SELECT * FROM categories WHERE status = 1 ORDER BY display_order ASC, created_at DESC LIMIT ? OFFSET ?',
            [parseInt(limit), parseInt(offset)]
        );
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM categories WHERE status = 1');
        return { categories: rows, total };
    },

    getTree: async () => {
        const [rows] = await db.query(
            'SELECT * FROM categories WHERE status = 1 ORDER BY display_order ASC'
        );
        return rows;
    },

    findById: async (categoryId) => {
        const [rows] = await db.query(
            'SELECT * FROM categories WHERE category_id = ? AND status = 1',
            [categoryId]
        );
        return rows[0];
    },

    findByName: async (name) => {
        const [rows] = await db.query(
            'SELECT * FROM categories WHERE name = ? AND status = 1',
            [name]
        );
        return rows[0];
    },

    update: async (categoryId, categoryData, updatedBy) => {
        const { name, parent_category_id, display_order } = categoryData;
        
        await db.query(
            'UPDATE categories SET name = ?, parent_category_id = ?, display_order = ?, updated_by = ? WHERE category_id = ?',
            [name, parent_category_id || null, display_order || 0, updatedBy, categoryId]
        );
        
        return { category_id: categoryId, name, parent_category_id, display_order };
    },

    softDelete: async (categoryId, updatedBy) => {
        await db.query(
            'UPDATE categories SET status = 0, updated_by = ? WHERE category_id = ?',
            [updatedBy, categoryId]
        );
    },

    // Category-Attribute Mapping
    assignAttributes: async (categoryId, attributeIds, createdBy, connection = db) => {
        if (!attributeIds || attributeIds.length === 0) return;

        const mappings = attributeIds.map(attrId => [uuidv4(), categoryId, attrId]);
        const sql = 'INSERT INTO category_attributes (category_attribute_id, category_id, attribute_id) VALUES ?';
        await connection.query(sql, [mappings]);
    },

    unassignAttribute: async (categoryId, attributeId, connection = db) => {
        await connection.query(
            'DELETE FROM category_attributes WHERE category_id = ? AND attribute_id = ?',
            [categoryId, attributeId]
        );
    },

    getAttributesFlat: async (categoryId) => {
        const sql = `
            SELECT 
                a.attribute_id, 
                a.name as attribute_name, 
                av.attribute_value_id, 
                av.value as attribute_value
            FROM category_attributes ca
            JOIN attributes a ON ca.attribute_id = a.attribute_id
            LEFT JOIN attribute_values av ON a.attribute_id = av.attribute_id AND av.status = 1
            WHERE ca.category_id = ? AND a.status = 1
            ORDER BY a.name ASC, av.value ASC
        `;
        const [rows] = await db.query(sql, [categoryId]);
        return rows;
    },

    // Dependency checks
    countActiveChildren: async (categoryId) => {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM categories WHERE parent_category_id = ? AND status = 1',
            [categoryId]
        );
        return rows[0].count;
    },

    hasMappedAttributes: async (categoryId) => {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM category_attributes WHERE category_id = ?',
            [categoryId]
        );
        return rows[0].count > 0;
    }
};

module.exports = Category;
