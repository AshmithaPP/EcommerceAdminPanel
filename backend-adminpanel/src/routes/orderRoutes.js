const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', orderController.createOrder);
router.get('/', orderController.getUserOrders);
router.get('/:order_id', orderController.getOrderDetails);
router.post('/:order_id/cancel', orderController.cancelOrder);
router.get('/:order_id/track', orderController.trackOrder);

module.exports = router;
