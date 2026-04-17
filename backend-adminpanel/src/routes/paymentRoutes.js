const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Public or Customer routes
router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);

// Admin routes
router.get('/', protect, authorize('admin'), paymentController.getAllPayments);

module.exports = router;

