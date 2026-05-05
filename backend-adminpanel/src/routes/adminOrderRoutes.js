const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Protect all admin routes
router.use(protect);
router.use(authorize('admin', 'superadmin'));

router.get('/', adminOrderController.getAllOrders);
router.get('/:order_id', adminOrderController.getOrderDetails);
router.put('/:order_id/status', adminOrderController.updateOrderStatus);
router.put('/:order_id/shipping', adminOrderController.updateShippingDetails);

module.exports = router;
