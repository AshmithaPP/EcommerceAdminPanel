const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const checkAnalyticsAccess = (req, res, next) => {
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
        return next();
    }
    if (req.user.role === 'subadmin') {
        const perms = req.user.permissions || {};
        if (perms.analytics && perms.analytics.includes('view')) {
            return next();
        }
    }
    const error = new Error(`User role ${req.user.role} is not authorized to access this route`);
    error.statusCode = 403;
    return next(error);
};

// Grouped Analytics Endpoints
router.get('/summary', protect, checkAnalyticsAccess, analyticsController.getSummary);
router.get('/trends', protect, checkAnalyticsAccess, analyticsController.getTrends);
router.get('/products', protect, checkAnalyticsAccess, analyticsController.getProducts);
router.get('/customers', protect, checkAnalyticsAccess, analyticsController.getCustomers);
router.get('/inventory', protect, checkAnalyticsAccess, analyticsController.getInventory);

module.exports = router;
