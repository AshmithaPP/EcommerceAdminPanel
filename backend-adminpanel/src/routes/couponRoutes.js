const express = require('express');
const couponController = require('../controllers/couponController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const { createCouponSchema, updateCouponSchema, validateCouponSchema } = require('../validators/couponValidator');

const router = express.Router();

// --- Public routes (no auth required, accessible by guests) ---
router.get('/active', couponController.listActiveCoupons);
router.post('/validate', validate(validateCouponSchema), couponController.validateCoupon);

// --- Admin-only routes (require login + admin role) ---
router.post('/', protect, authorize('admin'), validate(createCouponSchema), couponController.createCoupon);
router.get('/', protect, authorize('admin'), couponController.listCoupons);
router.put('/:couponId', protect, authorize('admin'), validate(updateCouponSchema), couponController.updateCoupon);
router.delete('/:couponId', protect, authorize('admin'), couponController.deleteCoupon);
router.get('/:couponId/usage', protect, authorize('admin'), couponController.getCouponUsageHistory);

module.exports = router;
