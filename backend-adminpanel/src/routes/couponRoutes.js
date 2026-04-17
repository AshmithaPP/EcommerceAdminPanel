const express = require('express');
const couponController = require('../controllers/couponController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const { createCouponSchema, updateCouponSchema, validateCouponSchema } = require('../validators/couponValidator');

const router = express.Router();

router.use(protect);

// Admin routes
router.post('/', authorize('admin'), validate(createCouponSchema), couponController.createCoupon);
router.get('/', authorize('admin'), couponController.listCoupons);

// User route
router.post('/validate', validate(validateCouponSchema), couponController.validateCoupon);

// Admin coupon management routes by ID
router.put('/:couponId', authorize('admin'), validate(updateCouponSchema), couponController.updateCoupon);
router.delete('/:couponId', authorize('admin'), couponController.deleteCoupon);
router.get('/:couponId/usage', authorize('admin'), couponController.getCouponUsageHistory);

module.exports = router;
