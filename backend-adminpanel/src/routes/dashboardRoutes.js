const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All dashboard endpoints are restricted to admin and superadmin roles
router.use(protect);
router.use(authorize('admin', 'superadmin'));

router.get('/summary', dashboardController.getSummary);
router.get('/sales-trend', dashboardController.getSalesTrend);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/alerts', dashboardController.getAlerts);
router.get('/recent-orders', dashboardController.getRecentOrders);
router.get('/comparative-analytics', dashboardController.getComparativeAnalytics);
router.get('/order-status', dashboardController.getOrderStatusAnalytics);
router.get('/export-report', dashboardController.downloadReport);

module.exports = router;
