const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, optionalProtect } = require('../middlewares/authMiddleware');

// 1. Guest Tracking Route (must go BEFORE the /:order_id param route)
router.get('/track', orderController.trackGuestOrder);

// 2. Create Order Route (accessible by guests or logged-in users)
router.post('/', optionalProtect, orderController.createOrder);

// 3. User Orders History Route (strictly protected)
router.get('/', protect, orderController.getUserOrders);

// 4. View Order Details Route (accessible by guests matching guest_id/uuid or matching logged-in user)
router.get('/:order_id', optionalProtect, orderController.getOrderDetails);

// 5. Cancel Order Route (strictly protected)
router.post('/:order_id/cancel', protect, orderController.cancelOrder);

// 6. Registered User Order Track Route (strictly protected)
router.get('/:order_id/track', protect, orderController.trackOrder);

module.exports = router;
