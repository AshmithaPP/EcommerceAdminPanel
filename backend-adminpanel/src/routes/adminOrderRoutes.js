const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');
const { protect, authorize, checkPermission } = require('../middlewares/authMiddleware');

// Protect all admin routes
router.use(protect);
router.use(authorize('admin', 'superadmin', 'subadmin'));

router.get('/', checkPermission('orders', 'view'), adminOrderController.getAllOrders);
router.get('/:order_id', checkPermission('orders', 'view'), adminOrderController.getOrderDetails);
router.put('/:order_id/status', checkPermission('orders', 'update'), adminOrderController.updateOrderStatus);
router.put('/:order_id/shipping', checkPermission('shipping', 'update'), adminOrderController.updateShipmentDetails);
router.get('/:order_id/shipment', checkPermission('orders', 'view'), adminOrderController.getShipmentDetails);
router.put('/:order_id/shipment', checkPermission('shipping', 'update'), adminOrderController.updateShipmentDetails);

module.exports = router;
