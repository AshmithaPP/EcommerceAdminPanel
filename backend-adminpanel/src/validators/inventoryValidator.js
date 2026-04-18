const Joi = require('joi');

const restockSchema = Joi.object({
    quantity: Joi.number().integer().min(1).required().messages({
        'number.base': 'Quantity must be a number',
        'number.integer': 'Quantity must be an integer',
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required'
    }),
    reason: Joi.string().min(3).max(500).required().messages({
        'string.min': 'Reason must be at least 3 characters',
        'any.required': 'Reason is required'
    })
});

const setStockSchema = Joi.object({
    stock: Joi.number().integer().min(0).required().messages({
        'number.base': 'Stock must be a number',
        'number.integer': 'Stock must be an integer',
        'number.min': 'Stock cannot be negative',
        'any.required': 'Stock is required'
    }),
    reason: Joi.string().min(3).max(500).required().messages({
        'string.min': 'Reason must be at least 3 characters',
        'any.required': 'Reason is required'
    })
});

const updateLowStockThresholdSchema = Joi.object({
    threshold: Joi.number().integer().min(0).required().messages({
        'number.base': 'Threshold must be a number',
        'number.integer': 'Threshold must be an integer',
        'number.min': 'Threshold cannot be negative',
        'any.required': 'Threshold is required'
    })
});

module.exports = {
    restockSchema,
    setStockSchema,
    updateLowStockThresholdSchema
};
