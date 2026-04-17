const attributeService = require('../services/attributeService');
const { 
    attributeSchema, 
    attributeValuesSchema, 
    updateAttributeValueSchema,
    uuidSchema 
} = require('../validators/attributeValidator');

const attributeController = {
    createAttribute: async (req, res, next) => {
        try {
            const { error } = attributeSchema.validate(req.body);
            if (error) {
                const err = new Error(error.details[0].message);
                err.statusCode = 400;
                throw err;
            }

            const attribute = await attributeService.createAttribute(req.body.name, req.user.user_id);

            res.status(201).json({
                success: true,
                message: 'Attribute created successfully',
                data: attribute, // Direct object
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    getAttributes: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const { attributes, total } = await attributeService.getAttributes(page, limit);

            res.status(200).json({
                success: true,
                message: 'Attributes fetched successfully',
                data: {
                    items: attributes, // Normalized list
                    pagination: {
                        total,
                        page,
                        limit,
                        pages: Math.ceil(total / limit)
                    }
                },
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    updateAttribute: async (req, res, next) => {
        try {
            const { attribute_id } = req.params;
            const { error: idError } = uuidSchema.validate(attribute_id);
            if (idError) throw new Error('Invalid attribute ID format');

            const { error } = attributeSchema.validate(req.body);
            if (error) {
                const err = new Error(error.details[0].message);
                err.statusCode = 400;
                throw err;
            }

            const attribute = await attributeService.updateAttribute(attribute_id, req.body.name, req.user.user_id);

            res.status(200).json({
                success: true,
                message: 'Attribute updated successfully',
                data: attribute, // Direct object
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    deleteAttribute: async (req, res, next) => {
        try {
            const { attribute_id } = req.params;
            const { error: idError } = uuidSchema.validate(attribute_id);
            if (idError) throw new Error('Invalid attribute ID format');

            await attributeService.deleteAttribute(attribute_id, req.user.user_id);

            res.status(200).json({
                success: true,
                message: 'Attribute deleted successfully',
                data: null,
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    addAttributeValues: async (req, res, next) => {
        try {
            const { attribute_id } = req.params;
            const { error: idError } = uuidSchema.validate(attribute_id);
            if (idError) throw new Error('Invalid attribute ID format');

            const { error } = attributeValuesSchema.validate(req.body);
            if (error) {
                const err = new Error(error.details[0].message);
                err.statusCode = 400;
                throw err;
            }

            const values = await attributeService.addAttributeValues(attribute_id, req.body.values, req.user.user_id);

            res.status(201).json({
                success: true,
                message: 'Attribute values added successfully',
                data: {
                    items: values // List of created values
                },
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    getAttributeValues: async (req, res, next) => {
        try {
            const { attribute_id } = req.params;
            const { error: idError } = uuidSchema.validate(attribute_id);
            if (idError) throw new Error('Invalid attribute ID format');

            const values = await attributeService.getAttributeValues(attribute_id);

            res.status(200).json({
                success: true,
                message: 'Attribute values fetched successfully',
                data: {
                    items: values // List of values
                },
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    updateAttributeValue: async (req, res, next) => {
        try {
            const { attribute_value_id } = req.params;
            const { error: idError } = uuidSchema.validate(attribute_value_id);
            if (idError) throw new Error('Invalid attribute value ID format');

            const { error } = updateAttributeValueSchema.validate(req.body);
            if (error) {
                const err = new Error(error.details[0].message);
                err.statusCode = 400;
                throw err;
            }

            await attributeService.updateAttributeValue(attribute_value_id, req.body.value, req.user.user_id);

            res.status(200).json({
                success: true,
                message: 'Attribute value updated successfully',
                data: null,
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    deleteAttributeValue: async (req, res, next) => {
        try {
            const { attribute_value_id } = req.params;
            const { error: idError } = uuidSchema.validate(attribute_value_id);
            if (idError) throw new Error('Invalid attribute value ID format');

            await attributeService.deleteAttributeValue(attribute_value_id, req.user.user_id);

            res.status(200).json({
                success: true,
                message: 'Attribute value deleted successfully',
                data: null,
                error: null
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = attributeController;
