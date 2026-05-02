const Attribute = require('../models/attributeModel');
const db = require('../config/database');

const attributeService = {
    createAttribute: async (name, createdBy) => {
        const trimmedName = name.trim();
        const existing = await Attribute.findByName(trimmedName);
        if (existing) {
            const error = new Error('Attribute with this name already exists');
            error.statusCode = 400;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const result = await Attribute.create(trimmedName, createdBy, connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getAttributes: async (page = 1, limit = 10) => {
        const offset = (page - 1) * limit;
        return await Attribute.getAll(limit, offset);
    },

    updateAttribute: async (attributeId, name, updatedBy) => {
        const trimmedName = name.trim();
        const attribute = await Attribute.findById(attributeId);
        if (!attribute) {
            const error = new Error('Attribute not found');
            error.statusCode = 404;
            throw error;
        }

        const existing = await Attribute.findByName(trimmedName);
        if (existing && existing.attribute_id !== attributeId) {
            const error = new Error('Attribute with this name already exists');
            error.statusCode = 400;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const result = await Attribute.update(attributeId, trimmedName, updatedBy, connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    deleteAttribute: async (attributeId, updatedBy) => {
        const attribute = await Attribute.findById(attributeId);
        if (!attribute) {
            const error = new Error('Attribute not found');
            error.statusCode = 404;
            throw error;
        }

        const hasValues = await Attribute.hasValues(attributeId);
        if (hasValues) {
            const error = new Error('Cannot delete attribute that has values. Delete values first.');
            error.statusCode = 400;
            throw error;
        }

        const isMapped = await Attribute.isMappedToCategories(attributeId);
        if (isMapped) {
            const error = new Error('Cannot delete attribute that is mapped to categories. Unassign first.');
            error.statusCode = 400;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await Attribute.softDelete(attributeId, updatedBy, connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    addAttributeValues: async (attributeId, values, createdBy) => {
        const attribute = await Attribute.findById(attributeId);
        if (!attribute) {
            const error = new Error('Attribute not found');
            error.statusCode = 404;
            throw error;
        }

        const normalizedValues = values.map(v => {
            if (typeof v === 'object') {
                return {
                    value: v.value.trim(),
                    color_code: v.color_code || null
                };
            }
            return v.trim();
        }).filter(v => (typeof v === 'object' ? v.value.length > 0 : v.length > 0));

        if (normalizedValues.length === 0) {
            const error = new Error('At least one non-empty value is required');
            error.statusCode = 400;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const result = await Attribute.createValues(attributeId, normalizedValues, createdBy, connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                const err = new Error('One or more values already exist for this attribute');
                err.statusCode = 400;
                throw err;
            }
            throw error;
        } finally {
            connection.release();
        }
    },

    getAttributeValues: async (attributeId) => {
        const attribute = await Attribute.findById(attributeId);
        if (!attribute) {
            const error = new Error('Attribute not found');
            error.statusCode = 404;
            throw error;
        }
        return await Attribute.getValues(attributeId);
    },

    updateAttributeValue: async (valueId, newValue, updatedBy) => {
        const value = await Attribute.getValueById(valueId);
        if (!value) {
            const error = new Error('Attribute value not found');
            error.statusCode = 404;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            // newValue can be a string or an object
            const data = typeof newValue === 'object' ? {
                value: newValue.value.trim(),
                color_code: newValue.color_code || null
            } : {
                value: newValue.trim(),
                color_code: null
            };
            await Attribute.updateValue(valueId, data, updatedBy, connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                const err = new Error('Value already exists for this attribute');
                err.statusCode = 400;
                throw err;
            }
            throw error;
        } finally {
            connection.release();
        }
    },

    deleteAttributeValue: async (valueId, updatedBy) => {
        const value = await Attribute.getValueById(valueId);
        if (!value) {
            const error = new Error('Attribute value not found');
            error.statusCode = 404;
            throw error;
        }

        const isUsed = await Attribute.isUsedInProducts(valueId);
        if (isUsed) {
            const error = new Error('This value is used in products and cannot be deleted');
            error.statusCode = 400;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await Attribute.softDeleteValue(valueId, updatedBy, connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = attributeService;
