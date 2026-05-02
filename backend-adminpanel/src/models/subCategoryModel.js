const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const SubCategory = {
    create: async (subCategoryData, createdBy) => {
        const { name, category_id, display_order, slug } = subCategoryData;
        const subCategoryId = uuidv4();
        
        await db.query(
            'INSERT INTO sub_categories (sub_category_id, category_id, name, slug, display_order, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [subCategoryId, category_id, name, slug || null, display_order || 0, createdBy]
        );
        
        return { sub_category_id: subCategoryId, name, category_id, display_order };
    },

    getAll: async (limit = 10, offset = 0) => {
        const [rows] = await db.query(
            'SELECT sc.*, c.name as category_name FROM sub_categories sc JOIN categories c ON sc.category_id = c.category_id WHERE sc.status = 1 ORDER BY sc.display_order ASC, sc.created_at DESC LIMIT ? OFFSET ?',
            [parseInt(limit), parseInt(offset)]
        );
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM sub_categories WHERE status = 1');
        return { sub_categories: rows, total };
    },

    getByCategoryId: async (categoryId) => {
        const [rows] = await db.query(
            'SELECT * FROM sub_categories WHERE category_id = ? AND status = 1 ORDER BY display_order ASC',
            [categoryId]
        );
        return rows;
    },

    findById: async (subCategoryId) => {
        const [rows] = await db.query(
            'SELECT sc.*, c.name as category_name FROM sub_categories sc JOIN categories c ON sc.category_id = c.category_id WHERE sc.sub_category_id = ? AND sc.status = 1',
            [subCategoryId]
        );
        return rows[0];
    },

    findByName: async (name, categoryId) => {
        const [rows] = await db.query(
            'SELECT * FROM sub_categories WHERE name = ? AND category_id = ? AND status = 1',
            [name, categoryId]
        );
        return rows[0];
    },

    update: async (subCategoryId, subCategoryData, updatedBy) => {
        const { name, category_id, display_order, slug } = subCategoryData;
        
        await db.query(
            'UPDATE sub_categories SET name = ?, category_id = ?, display_order = ?, slug = ?, updated_by = ? WHERE sub_category_id = ?',
            [name, category_id, display_order || 0, slug || null, updatedBy, subCategoryId]
        );
        
        return { sub_category_id: subCategoryId, name, category_id, display_order };
    },

    softDelete: async (subCategoryId, updatedBy) => {
        await db.query(
            'UPDATE sub_categories SET status = 0, updated_by = ? WHERE sub_category_id = ?',
            [updatedBy, subCategoryId]
        );
    },

    // Sub Category Attribute Mapping
    assignAttributes: async (subCategoryId, attributes, createdBy, connection = db) => {
        if (!attributes || attributes.length === 0) return;

        const mappings = attributes.map(attr => {
            const attrId = typeof attr === 'string' ? attr : attr.attribute_id;
            const isVariant = typeof attr === 'object' ? (attr.is_variant_attribute ? 1 : 0) : 0;
            return [
                uuidv4(), 
                subCategoryId, 
                attrId, 
                isVariant,
                createdBy
            ];
        });
        const sql = 'INSERT INTO sub_category_attributes (sub_category_attribute_id, sub_category_id, attribute_id, is_variant_attribute, created_by) VALUES ?';
        await connection.query(sql, [mappings]);
    },

    unassignAttribute: async (subCategoryId, attributeId, connection = db) => {
        await connection.query(
            'DELETE FROM sub_category_attributes WHERE sub_category_id = ? AND attribute_id = ?',
            [subCategoryId, attributeId]
        );
    },

    getAttributesFlat: async (subCategoryId) => {
        const sql = `
            SELECT 
                a.attribute_id, 
                a.name as attribute_name, 
                sca.is_variant_attribute,
                av.attribute_value_id, 
                av.value as attribute_value,
                av.color_code
            FROM sub_category_attributes sca
            JOIN attributes a ON sca.attribute_id = a.attribute_id
            LEFT JOIN attribute_values av ON a.attribute_id = av.attribute_id AND av.status = 1
            WHERE sca.sub_category_id = ? AND a.status = 1
            ORDER BY a.name ASC, av.value ASC
        `;
        const [rows] = await db.query(sql, [subCategoryId]);
        return rows;
    },

    hasProducts: async (subCategoryId) => {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM products WHERE sub_category_id = ? AND status = 1',
            [subCategoryId]
        );
        return rows[0].count > 0;
    }
};

module.exports = SubCategory;
