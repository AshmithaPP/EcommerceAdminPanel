const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const checkDashboardAccess = (req, res, next) => {
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
        return next();
    }
    if (req.user.role === 'subadmin') {
        const perms = req.user.permissions || {};
        if (perms.dashboard && perms.dashboard.includes('view')) {
            return next();
        }
    }
    const error = new Error(`User role ${req.user.role} is not authorized to access this route`);
    error.statusCode = 403;
    return next(error);
};

// Protect all dashboard routes
router.use(protect);
router.use(checkDashboardAccess);

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
