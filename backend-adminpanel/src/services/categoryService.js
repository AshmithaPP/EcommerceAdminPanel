const Category = require('../models/categoryModel');
const SubCategory = require('../models/subCategoryModel');
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
            const slug = categoryData.slug || trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const result = await Category.create({ 
                ...categoryData, 
                name: trimmedName,
                slug: slug,
                is_featured: !!categoryData.is_featured,
                image_url: categoryData.image_url || null
            }, createdBy, connection);
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
        const { sub_categories } = await SubCategory.getAll(1000, 0);
        
        return categories.map(category => ({
            ...category,
            children: sub_categories
                .filter(sub => sub.category_id === category.category_id)
                .map(sub => ({
                    ...sub,
                    category_id: sub.sub_category_id, // For tree consistency if needed, or keep as is
                    parent_category_id: sub.category_id
                }))
        }));
    },

    // Sub Category Methods
    createSubCategory: async (subCategoryData, createdBy) => {
        const trimmedName = subCategoryData.name.trim();
        const existing = await SubCategory.findByName(trimmedName, subCategoryData.category_id);
        if (existing) {
            const error = new Error('Sub-category with this name already exists in this category');
            error.statusCode = 400;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const result = await SubCategory.create({ ...subCategoryData, name: trimmedName }, createdBy);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getSubCategoriesByCategoryId: async (categoryId) => {
        return await SubCategory.getByCategoryId(categoryId);
    },

    getSubCategoryById: async (subCategoryId) => {
        const subCategory = await SubCategory.findById(subCategoryId);
        if (!subCategory) {
            const error = new Error('Sub-category not found');
            error.statusCode = 404;
            throw error;
        }
        return subCategory;
    },

    updateSubCategory: async (subCategoryId, subCategoryData, updatedBy) => {
        const trimmedName = subCategoryData.name ? subCategoryData.name.trim() : null;
        const subCategory = await SubCategory.findById(subCategoryId);
        if (!subCategory) {
            const error = new Error('Sub-category not found');
            error.statusCode = 404;
            throw error;
        }

        if (trimmedName) {
            const existing = await SubCategory.findByName(trimmedName, subCategoryData.category_id || subCategory.category_id);
            if (existing && existing.sub_category_id !== subCategoryId) {
                const error = new Error('Sub-category with this name already exists in this category');
                error.statusCode = 400;
                throw error;
            }
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const result = await SubCategory.update(subCategoryId, { 
                ...subCategoryData, 
                name: trimmedName || subCategory.name,
                category_id: subCategoryData.category_id || subCategory.category_id,
                display_order: subCategoryData.display_order !== undefined ? subCategoryData.display_order : subCategory.display_order,
                slug: subCategoryData.slug !== undefined ? subCategoryData.slug : subCategory.slug
            }, updatedBy);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    deleteSubCategory: async (subCategoryId, updatedBy) => {
        const subCategory = await SubCategory.findById(subCategoryId);
        if (!subCategory) {
            const error = new Error('Sub-category not found');
            error.statusCode = 404;
            throw error;
        }

        const hasProducts = await SubCategory.hasProducts(subCategoryId);
        if (hasProducts) {
            const error = new Error('Cannot delete sub-category with linked products');
            error.statusCode = 400;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await SubCategory.softDelete(subCategoryId, updatedBy);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    assignSubCategoryAttributes: async (subCategoryId, attributeIds, createdBy) => {
        const subCategory = await SubCategory.findById(subCategoryId);
        if (!subCategory) {
            const error = new Error('Sub-category not found');
            error.statusCode = 404;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            for (const attrId of attributeIds) {
                const attr = await Attribute.findById(attrId);
                if (!attr) throw new Error(`Attribute with ID ${attrId} not found`);
            }

            const currentMapped = await SubCategory.getAttributesFlat(subCategoryId);
            const currentMappedIds = [...new Set(currentMapped.map(m => m.attribute_id))];
            
            const toAssign = attributeIds.filter(id => !currentMappedIds.includes(id));
            const toUnassign = currentMappedIds.filter(id => !attributeIds.includes(id));

            if (toAssign.length > 0) {
                await SubCategory.assignAttributes(subCategoryId, toAssign, createdBy, connection);
            }

            if (toUnassign.length > 0) {
                for (const attrId of toUnassign) {
                    await SubCategory.unassignAttribute(subCategoryId, attrId, connection);
                }
            }

            await connection.commit();
            return { assigned: toAssign, unassigned: toUnassign };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    unassignSubCategoryAttribute: async (subCategoryId, attributeId) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await SubCategory.unassignAttribute(subCategoryId, attributeId, connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getSubCategoryAttributes: async (subCategoryId) => {
        const flatData = await SubCategory.getAttributesFlat(subCategoryId);
        return flatData.reduce((acc, row) => {
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
                    value: row.attribute_value,
                    color_code: row.color_code
                });
            }
            return acc;
        }, []);
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
            const slug = categoryData.slug || (trimmedName ? trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : category.slug);
            const result = await Category.update(categoryId, { 
                ...categoryData, 
                name: trimmedName || category.name,
                slug: slug,
                is_featured: categoryData.is_featured !== undefined ? !!categoryData.is_featured : category.is_featured,
                image_url: categoryData.image_url !== undefined ? categoryData.image_url : category.image_url,
                display_order: categoryData.display_order !== undefined ? categoryData.display_order : category.display_order
            }, updatedBy, connection);
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

        const subCount = await Category.countActiveSubCategories(categoryId);
        if (subCount > 0) {
            const error = new Error(`Cannot delete category with ${subCount} active sub-categories`);
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

            // Fetch current mappings to reconcile
            const currentMapped = await Category.getAttributesFlat(categoryId);
            const currentMappedIds = [...new Set(currentMapped.map(m => m.attribute_id))];
            
            const toAssign = attributeIds.filter(id => !currentMappedIds.includes(id));
            const toUnassign = currentMappedIds.filter(id => !attributeIds.includes(id));

            if (toAssign.length > 0) {
                await Category.assignAttributes(categoryId, toAssign, createdBy, connection);
            }

            if (toUnassign.length > 0) {
                for (const attrId of toUnassign) {
                    await Category.unassignAttribute(categoryId, attrId, connection);
                }
            }

            await connection.commit();
            return { assigned: toAssign, unassigned: toUnassign };
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
