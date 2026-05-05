const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/checkoutPaymentController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/initiate', protect, paymentController.initiatePayment);
router.post('/verify', protect, paymentController.verifyPayment);

module.exports = router;
