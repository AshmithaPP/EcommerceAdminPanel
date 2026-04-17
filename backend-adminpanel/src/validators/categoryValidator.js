const Joi = require('joi');

const categorySchema = Joi.object({
    name: Joi.string().min(2).max(255).required(),
    parent_category_id: Joi.string().guid({ version: 'uuidv4' }).allow(null).optional(),
    display_order: Joi.number().integer().min(0).optional()
});

const assignAttributesSchema = Joi.object({
    attribute_ids: Joi.array().items(Joi.string().guid({ version: 'uuidv4' })).min(1).required()
});

const uuidSchema = Joi.string().guid({ version: 'uuidv4' }).required();

module.exports = {
    categorySchema,
    assignAttributesSchema,
    uuidSchema
};
