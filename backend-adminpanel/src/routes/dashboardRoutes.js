const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Protect all dashboard routes
router.use(protect);
router.use(authorize('admin', 'superadmin'));

// Core APIs
router.get('/overview', dashboardController.getOverview);
router.get('/sales-trend', dashboardController.getSalesTrend);
router.get('/top-products', dashboardController.getTopProducts);

// Advanced Analytics
router.get('/revenue-breakdown', dashboardController.getRevenueBreakdown);
router.get('/top-categories', dashboardController.getTopCategories);
router.get('/customer-insights', dashboardController.getCustomerInsights);
router.get('/payment-analytics', dashboardController.getPaymentAnalytics);
router.get('/inventory-health', dashboardController.getInventoryHealth);

module.exports = router;
