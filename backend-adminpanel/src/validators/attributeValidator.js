const Joi = require('joi');

const attributeSchema = Joi.object({
    name: Joi.string().min(2).max(255).required()
});

const attributeValuesSchema = Joi.object({
    values: Joi.array().items(Joi.string().min(1).max(255)).min(1).required()
});

const updateAttributeValueSchema = Joi.object({
    value: Joi.string().min(1).max(255).required()
});

const uuidSchema = Joi.string().guid({ version: 'uuidv4' }).required();

module.exports = {
    attributeSchema,
    attributeValuesSchema,
    updateAttributeValueSchema,
    uuidSchema
};
