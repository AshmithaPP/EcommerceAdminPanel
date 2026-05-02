const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Attribute = {
    /**
     * Creates a new attribute.
     * If a soft-deleted record with the same name exists, it is RESTORED
     * instead of inserting a new row (avoids UNIQUE constraint collision).
     */
    create: async (name, createdBy) => {
        // Check for a soft-deleted record with the same name
        const [existing] = await db.query(
            'SELECT * FROM attributes WHERE name = ? AND status = 0',
            [name]
        );

        if (existing.length > 0) {
            // Restore the soft-deleted record
            const attr = existing[0];
            await db.query(
                'UPDATE attributes SET status = 1, created_by = ?, updated_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE attribute_id = ?',
                [createdBy, attr.attribute_id]
            );
            return { attribute_id: attr.attribute_id, name: attr.name };
        }

        // No conflict — do a fresh insert
        const attributeId = uuidv4();
        await db.query(
            'INSERT INTO attributes (attribute_id, name, created_by) VALUES (?, ?, ?)',
            [attributeId, name, createdBy]
        );
        return { attribute_id: attributeId, name };
    },

    getAll: async (limit = 10, offset = 0) => {
        const [attributes] = await db.query(
            'SELECT * FROM attributes WHERE status = 1 ORDER BY name ASC LIMIT ? OFFSET ?',
            [parseInt(limit), parseInt(offset)]
        );

        if (attributes.length === 0) {
            return { attributes: [], total: 0 };
        }

        const attributeIds = attributes.map(a => a.attribute_id);
        const [values] = await db.query(
            'SELECT * FROM attribute_values WHERE attribute_id IN (?) AND status = 1 ORDER BY value ASC',
            [attributeIds]
        );

        // Group values by attribute_id
        const attributesWithValues = attributes.map(attr => ({
            ...attr,
            values: values.filter(v => v.attribute_id === attr.attribute_id)
        }));

        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM attributes WHERE status = 1');
        return { attributes: attributesWithValues, total };
    },

    findById: async (attributeId) => {
        const [rows] = await db.query(
            'SELECT * FROM attributes WHERE attribute_id = ? AND status = 1',
            [attributeId]
        );
        return rows[0];
    },

    findByName: async (name) => {
        const [rows] = await db.query(
            // Only active records block duplicates — soft-deleted names can be re-used
            'SELECT * FROM attributes WHERE name = ? AND status = 1',
            [name]
        );
        return rows[0];
    },

    update: async (attributeId, name, updatedBy) => {
        await db.query(
            'UPDATE attributes SET name = ?, updated_by = ? WHERE attribute_id = ?',
            [name, updatedBy, attributeId]
        );
        return { attribute_id: attributeId, name };
    },

    softDelete: async (attributeId, updatedBy) => {
        await db.query(
            'UPDATE attributes SET status = 0, updated_by = ? WHERE attribute_id = ?',
            [updatedBy, attributeId]
        );
    },

    // Attribute Values
    createValues: async (attributeId, values, createdBy, connection = db) => {
        if (!values || values.length === 0) return [];
        
        const results = [];
        for (const valObj of values) {
            const isObject = typeof valObj === 'object';
            const val = isObject ? valObj.value : valObj;
            const colorCode = isObject ? valObj.color_code : null;
            
            const trimmedVal = val.trim();
            
            // Check if value already exists (including soft-deleted)
            const [existing] = await connection.query(
                'SELECT * FROM attribute_values WHERE attribute_id = ? AND value = ?',
                [attributeId, trimmedVal]
            );

            if (existing.length > 0) {
                const row = existing[0];
                if (row.status === 0 || colorCode !== row.color_code) {
                    // Restore soft-deleted value or update existing metadata
                    await connection.query(
                        'UPDATE attribute_values SET status = 1, color_code = ? WHERE attribute_value_id = ?',
                        [colorCode || row.color_code, row.attribute_value_id]
                    );
                }
                results.push({ 
                    attribute_value_id: row.attribute_value_id, 
                    value: trimmedVal,
                    color_code: colorCode || row.color_code
                });
            } else {
                // Insert new value
                const valueId = uuidv4();
                await connection.query(
                    'INSERT INTO attribute_values (attribute_value_id, attribute_id, value, color_code) VALUES (?, ?, ?, ?)',
                    [valueId, attributeId, trimmedVal, colorCode]
                );
                results.push({ 
                    attribute_value_id: valueId, 
                    value: trimmedVal,
                    color_code: colorCode
                });
            }
        }
        
        return results;
    },

    getValues: async (attributeId) => {
        const [rows] = await db.query(
            'SELECT * FROM attribute_values WHERE attribute_id = ? AND status = 1 ORDER BY value ASC',
            [attributeId]
        );
        return rows;
    },

    getValueById: async (valueId) => {
        const [rows] = await db.query(
            'SELECT * FROM attribute_values WHERE attribute_value_id = ? AND status = 1',
            [valueId]
        );
        return rows[0];
    },

    updateValue: async (valueId, data, updatedBy) => {
        const { value, color_code } = data;
        await db.query(
            'UPDATE attribute_values SET value = ?, color_code = ? WHERE attribute_value_id = ?',
            [value.trim(), color_code || null, valueId]
        );
    },

    softDeleteValue: async (valueId, updatedBy) => {
        await db.query(
            'UPDATE attribute_values SET status = 0 WHERE attribute_value_id = ?', 
            [valueId]
        );
    },

    // Dependency checks
    hasValues: async (attributeId) => {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM attribute_values WHERE attribute_id = ? AND status = 1',
            [attributeId]
        );
        return rows[0].count > 0;
    },

    isMappedToCategories: async (attributeId) => {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM category_attributes WHERE attribute_id = ?',
            [attributeId]
        );
        return rows[0].count > 0;
    },

    isUsedInProducts: async (valueId) => {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM product_attribute_values WHERE attribute_value_id = ?',
            [valueId]
        );
        return rows[0].count > 0;
    }
};

module.exports = Attribute;

module.exports = Attribute;
