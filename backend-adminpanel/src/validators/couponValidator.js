const Joi = require('joi');

const createCouponSchema = Joi.object({
    code: Joi.string().trim().uppercase().alphanum().min(3).max(50).required(),
    discount_type: Joi.string().valid('percentage', 'flat').required(),
    discount_value: Joi.number().precision(2).positive().required(),
    min_order_value: Joi.number().precision(2).min(0).default(0),
    max_discount_cap: Joi.number().precision(2).min(0).allow(null),
    expiry_date: Joi.date().allow(null),
    total_usage_limit: Joi.number().integer().min(1).allow(null),
    per_user_usage_limit: Joi.number().integer().min(1).allow(null),
    is_active: Joi.boolean().required()
});

const updateCouponSchema = Joi.object({
    code: Joi.string().trim().uppercase().alphanum().min(3).max(50).optional(),
    discount_type: Joi.string().valid('percentage', 'flat').optional(),
    discount_value: Joi.number().precision(2).positive().optional(),
    min_order_value: Joi.number().precision(2).min(0).optional(),
    max_discount_cap: Joi.number().precision(2).min(0).allow(null).optional(),
    expiry_date: Joi.date().allow(null).optional(),
    total_usage_limit: Joi.number().integer().min(1).allow(null).optional(),
    per_user_usage_limit: Joi.number().integer().min(1).allow(null).optional(),
    is_active: Joi.boolean().optional()
}).min(1);

const validateCouponSchema = Joi.object({
    code: Joi.string().trim().uppercase().required(),
    orderAmount: Joi.number().precision(2).positive().required()
});

module.exports = { createCouponSchema, updateCouponSchema, validateCouponSchema };
