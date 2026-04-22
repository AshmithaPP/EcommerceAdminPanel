const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const adminOnly = authorize('admin', 'superadmin');

// Grouped Analytics Endpoints
router.get('/summary', protect, adminOnly, analyticsController.getSummary);
router.get('/trends', protect, adminOnly, analyticsController.getTrends);
router.get('/products', protect, adminOnly, analyticsController.getProducts);
router.get('/customers', protect, adminOnly, analyticsController.getCustomers);
router.get('/inventory', protect, adminOnly, analyticsController.getInventory);

module.exports = router;
