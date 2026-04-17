const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Aligning with the requested "Admin" context
router.get('/', orderController.listOrders);
router.get('/:order_id', orderController.getOrderDetails);

// Actions
router.patch('/:order_id/status', orderController.updateStatus);
router.patch('/:order_id/payment-status', orderController.updatePaymentStatus);

// Internal/Test Order Creation
router.post('/', orderController.createOrder);

module.exports = router;
