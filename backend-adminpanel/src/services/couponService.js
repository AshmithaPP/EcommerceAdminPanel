const Coupon = require('../models/couponModel');

const couponService = {
    createCoupon: async (payload) => {
        const existing = await Coupon.findByCode(payload.code);
        if (existing) {
            const error = new Error('Coupon code already exists');
            error.statusCode = 400;
            throw error;
        }

        const couponId = await Coupon.create(payload);
        return { coupon_id: couponId, ...payload };
    },

    listCoupons: async (page = 1, limit = 50, search = null) => {
        const offset = (page - 1) * limit;
        const { coupons, total } = await Coupon.list(limit, offset, search);
        return {
            coupons,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    },

    updateCoupon: async (couponId, payload) => {
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            const error = new Error('Coupon not found');
            error.statusCode = 404;
            throw error;
        }

        if (payload.code && payload.code !== coupon.code) {
            const existing = await Coupon.findByCode(payload.code);
            if (existing) {
                const error = new Error('Coupon code already exists');
                error.statusCode = 400;
                throw error;
            }
        }

        const success = await Coupon.update(couponId, payload);
        if (!success) {
            const error = new Error('Unable to update coupon');
            error.statusCode = 400;
            throw error;
        }

        return { coupon_id: couponId, ...payload };
    },

    deleteCoupon: async (couponId) => {
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            const error = new Error('Coupon not found');
            error.statusCode = 404;
            throw error;
        }

        await Coupon.delete(couponId);
        return { success: true, message: 'Coupon deleted successfully' };
    },

    validateCoupon: async (code, userId, orderAmount) => {
        const normalizedCode = code.trim().toUpperCase();
        const coupon = await Coupon.findByCode(normalizedCode);
        if (!coupon) {
            const error = new Error('Coupon not found');
            error.statusCode = 404;
            throw error;
        }

        if (!coupon.is_active) {
            const error = new Error('Coupon is not active');
            error.statusCode = 400;
            throw error;
        }

        if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
            const error = new Error('Coupon has expired');
            error.statusCode = 400;
            throw error;
        }

        if (orderAmount < coupon.min_order_value) {
            const error = new Error(`Minimum order value for this coupon is ${coupon.min_order_value}`);
            error.statusCode = 400;
            throw error;
        }

        if (coupon.total_usage_limit && coupon.usage_count >= coupon.total_usage_limit) {
            const error = new Error('Coupon usage limit has been reached');
            error.statusCode = 400;
            throw error;
        }

        const userUsage = await Coupon.getUserUsageCount(coupon.coupon_id, userId);
        if (coupon.per_user_usage_limit && userUsage >= coupon.per_user_usage_limit) {
            const error = new Error('You have reached the per-user usage limit for this coupon');
            error.statusCode = 400;
            throw error;
        }

        let discountAmount = 0;
        if (coupon.discount_type === 'percentage') {
            discountAmount = parseFloat((orderAmount * coupon.discount_value) / 100.0).toFixed(2);
            if (coupon.max_discount_cap && discountAmount > coupon.max_discount_cap) {
                discountAmount = parseFloat(coupon.max_discount_cap).toFixed(2);
            }
        } else {
            discountAmount = parseFloat(coupon.discount_value).toFixed(2);
        }

        if (discountAmount > orderAmount) {
            discountAmount = parseFloat(orderAmount).toFixed(2);
        }

        return {
            coupon_id: coupon.coupon_id,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: parseFloat(coupon.discount_value),
            discount_amount: parseFloat(discountAmount),
            min_order_value: parseFloat(coupon.min_order_value),
            max_discount_cap: coupon.max_discount_cap ? parseFloat(coupon.max_discount_cap) : null,
            expiry_date: coupon.expiry_date,
            total_usage_limit: coupon.total_usage_limit,
            per_user_usage_limit: coupon.per_user_usage_limit,
            usage_count: coupon.usage_count,
            final_amount: parseFloat((orderAmount - discountAmount).toFixed(2))
        };
    },

    applyCouponOnOrder: async (couponCode, userId, orderAmount, connection) => {
        const validated = await couponService.validateCoupon(couponCode, userId, orderAmount);
        await Coupon.incrementUsageCount(validated.coupon_id, connection);
        return validated;
    },

    recordCouponUsage: async (couponId, userId, orderId, discountApplied, connection) => {
        await Coupon.recordUsage({ coupon_id: couponId, user_id: userId, order_id: orderId, discount_applied: discountApplied }, connection);
    },

    getCouponUsageHistory: async (couponId) => {
        return await Coupon.getUsageHistory(couponId);
    }
};

module.exports = couponService;
