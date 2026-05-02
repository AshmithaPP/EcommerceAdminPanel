const Joi = require('joi');

const attributeSchema = Joi.object({
    name: Joi.string().min(2).max(255).required()
});

const attributeValuesSchema = Joi.object({
    values: Joi.array().items(
        Joi.alternatives().try(
            Joi.string().min(1).max(255),
            Joi.object({
                value: Joi.string().min(1).max(255).required(),
                color_code: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).allow(null, '')
            })
        )
    ).min(1).required()
});

const updateAttributeValueSchema = Joi.object({
    value: Joi.string().min(1).max(255).required(),
    color_code: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).allow(null, '')
});

const uuidSchema = Joi.string().guid({ version: 'uuidv4' }).required();

module.exports = {
    attributeSchema,
    attributeValuesSchema,
    updateAttributeValueSchema,
    uuidSchema
};
