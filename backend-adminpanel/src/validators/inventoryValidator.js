const Joi = require('joi');

const manualStockAdjustmentSchema = Joi.object({
    quantityDelta: Joi.number()
        .integer()
        .required()
        .messages({
            'number.base': 'Quantity delta must be a number',
            'number.integer': 'Quantity delta must be an integer',
            'any.required': 'Quantity delta is required'
        }),
    reason: Joi.string()
        .min(5)
        .max(500)
        .required()
        .messages({
            'string.min': 'Reason must be at least 5 characters',
            'string.max': 'Reason cannot exceed 500 characters',
            'any.required': 'Reason is required'
        })
});

const bulkStockUpdateSchema = Joi.object({
    updates: Joi.array()
        .items(
            Joi.object({
                variantId: Joi.string()
                    .required()
                    .messages({
                        'any.required': 'variantId is required for each update'
                    }),
                quantityDelta: Joi.number()
                    .integer()
                    .required()
                    .messages({
                        'number.integer': 'quantityDelta must be an integer',
                        'any.required': 'quantityDelta is required for each update'
                    })
            })
        )
        .min(1)
        .required()
        .messages({
            'array.min': 'At least one update is required',
            'any.required': 'Updates array is required'
        }),
    reason: Joi.string()
        .max(500)
        .optional()
        .messages({
            'string.max': 'Reason cannot exceed 500 characters'
        })
});

const updateLowStockThresholdSchema = Joi.object({
    threshold: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'Threshold must be a number',
            'number.integer': 'Threshold must be an integer',
            'number.min': 'Threshold cannot be negative',
            'any.required': 'Threshold is required'
        })
});

module.exports = {
    manualStockAdjustmentSchema,
    bulkStockUpdateSchema,
    updateLowStockThresholdSchema
};
