const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Category = {
    create: async (categoryData, createdBy) => {
        const { name, display_order } = categoryData;
        const categoryId = uuidv4();
        
        await db.query(
            'INSERT INTO categories (category_id, name, display_order, created_by) VALUES (?, ?, ?, ?)',
            [categoryId, name, display_order || 0, createdBy]
        );
        
        return { category_id: categoryId, name, display_order };
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
        const { name, display_order } = categoryData;
        
        await db.query(
            'UPDATE categories SET name = ?, display_order = ?, updated_by = ? WHERE category_id = ?',
            [name, display_order || 0, updatedBy, categoryId]
        );
        
        return { category_id: categoryId, name, display_order };
    },

    softDelete: async (categoryId, updatedBy) => {
        await db.query(
            'UPDATE categories SET status = 0, updated_by = ? WHERE category_id = ?',
            [updatedBy, categoryId]
        );
    },

    // Category-Attribute Mapping
    assignAttributes: async (categoryId, attributes, createdBy, connection = db) => {
        if (!attributes || attributes.length === 0) return;

        const mappings = attributes.map(attr => {
            const attrId = typeof attr === 'string' ? attr : attr.attribute_id;
            const isVariant = typeof attr === 'object' ? (attr.is_variant_attribute ? 1 : 0) : 0;
            return [
                uuidv4(), 
                categoryId, 
                attrId, 
                isVariant
            ];
        });
        const sql = 'INSERT INTO category_attributes (category_attribute_id, category_id, attribute_id, is_variant_attribute) VALUES ?';
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
                ca.is_variant_attribute,
                av.attribute_value_id, 
                av.value as attribute_value,
                av.color_code
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
    countActiveSubCategories: async (categoryId) => {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM sub_categories WHERE category_id = ? AND status = 1',
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
