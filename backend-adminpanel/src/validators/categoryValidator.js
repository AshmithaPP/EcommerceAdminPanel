const Joi = require('joi');

const categorySchema = Joi.object({
    name: Joi.string().min(2).max(255).required(),
    display_order: Joi.number().integer().min(0).optional(),
    slug: Joi.string().max(255).optional(),
    image_url: Joi.string().allow('', null).optional(),
    is_featured: Joi.boolean().optional()
});

const updateCategorySchema = Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    display_order: Joi.number().integer().min(0).optional(),
    slug: Joi.string().max(255).optional(),
    image_url: Joi.string().allow('', null).optional(),
    is_featured: Joi.boolean().optional()
});

const subCategorySchema = Joi.object({
    name: Joi.string().min(2).max(255).required(),
    category_id: Joi.string().guid({ version: 'uuidv4' }).required(),
    display_order: Joi.number().integer().min(0).optional(),
    slug: Joi.string().max(255).optional()
});

const updateSubCategorySchema = Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    category_id: Joi.string().guid({ version: 'uuidv4' }).optional(),
    display_order: Joi.number().integer().min(0).optional(),
    slug: Joi.string().max(255).optional()
});

const assignAttributesSchema = Joi.object({
    attribute_ids: Joi.array().items(Joi.string().guid({ version: 'uuidv4' })).min(1).required()
});

const uuidSchema = Joi.string().guid({ version: 'uuidv4' }).required();

module.exports = {
    categorySchema,
    updateCategorySchema,
    subCategorySchema,
    updateSubCategorySchema,
    assignAttributesSchema,
    uuidSchema
};

