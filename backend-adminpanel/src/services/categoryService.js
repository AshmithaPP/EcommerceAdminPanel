const Category = require('../models/categoryModel');
const Attribute = require('../models/attributeModel');
const db = require('../config/database');

const categoryService = {
    createCategory: async (categoryData, createdBy) => {
        const trimmedName = categoryData.name.trim();
        const existing = await Category.findByName(trimmedName);
        if (existing) {
            const error = new Error('Category with this name already exists');
            error.statusCode = 400;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const result = await Category.create({ ...categoryData, name: trimmedName }, createdBy, connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getCategories: async (page = 1, limit = 10) => {
        const offset = (page - 1) * limit;
        return await Category.getAll(limit, offset);
    },

    getCategoryById: async (categoryId) => {
        const category = await Category.findById(categoryId);
        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }
        return category;
    },

    getCategoryTree: async () => {
        const categories = await Category.getTree();
        
        const buildTree = (items, parentId = null) => {
            return items
                .filter(item => item.parent_category_id === parentId)
                .map(item => ({
                    ...item,
                    children: buildTree(items, item.category_id)
                }));
        };

        return buildTree(categories);
    },

    updateCategory: async (categoryId, categoryData, updatedBy) => {
        const trimmedName = categoryData.name ? categoryData.name.trim() : null;
        const category = await Category.findById(categoryId);
        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        if (trimmedName) {
            const existing = await Category.findByName(trimmedName);
            if (existing && existing.category_id !== categoryId) {
                const error = new Error('Category with this name already exists');
                error.statusCode = 400;
                throw error;
            }
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const result = await Category.update(categoryId, { ...categoryData, name: trimmedName || category.name }, updatedBy, connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    deleteCategory: async (categoryId, updatedBy) => {
        const category = await Category.findById(categoryId);
        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        const childCount = await Category.countActiveChildren(categoryId);
        if (childCount > 0) {
            const error = new Error(`Cannot delete category with ${childCount} active sub-categories`);
            error.statusCode = 400;
            throw error;
        }

        const hasMappings = await Category.hasMappedAttributes(categoryId);
        if (hasMappings) {
            const error = new Error('Cannot delete category with mapped attributes. Unassign them first.');
            error.statusCode = 400;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await Category.softDelete(categoryId, updatedBy, connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    assignAttributes: async (categoryId, attributeIds, createdBy) => {
        const category = await Category.findById(categoryId);
        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Validate all attributes exist
            for (const attrId of attributeIds) {
                const attr = await Attribute.findById(attrId);
                if (!attr) {
                    const error = new Error(`Attribute with ID ${attrId} not found`);
                    error.statusCode = 404;
                    throw error;
                }
            }

            // Fetch current mappings to avoid duplicates
            const currentMapped = await Category.getAttributesFlat(categoryId);
            const currentMappedIds = [...new Set(currentMapped.map(m => m.attribute_id))];
            
            const toAssign = attributeIds.filter(id => !currentMappedIds.includes(id));
            const skipped = attributeIds.filter(id => currentMappedIds.includes(id));

            if (toAssign.length > 0) {
                await Category.assignAttributes(categoryId, toAssign, createdBy, connection);
            }

            await connection.commit();
            return { assigned: toAssign, skipped };
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                const err = new Error('Duplicate attribute mapping detected');
                err.statusCode = 400;
                throw err;
            }
            throw error;
        } finally {
            connection.release();
        }
    },

    unassignAttribute: async (categoryId, attributeId) => {
        const category = await Category.findById(categoryId);
        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await Category.unassignAttribute(categoryId, attributeId, connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getCategoryAttributes: async (categoryId) => {
        const category = await Category.findById(categoryId);
        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        const flatData = await Category.getAttributesFlat(categoryId);
        
        const grouped = flatData.reduce((acc, row) => {
            let attr = acc.find(a => a.attribute_id === row.attribute_id);
            if (!attr) {
                attr = {
                    attribute_id: row.attribute_id,
                    name: row.attribute_name,
                    values: []
                };
                acc.push(attr);
            }
            if (row.attribute_value_id) {
                attr.values.push({
                    attribute_value_id: row.attribute_value_id,
                    value: row.attribute_value
                });
            }
            return acc;
        }, []);

        return grouped;
    }
};

module.exports = categoryService;
