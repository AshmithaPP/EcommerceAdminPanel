const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const { protect } = require('../middlewares/authMiddleware');

// Public API for shipping calculation (for checkout)
router.get('/calculate', shippingController.calculateShipping);

// Admin-only management routes
router.get('/zones', protect, shippingController.getAllZones);
router.post('/zones', protect, shippingController.createZone);
router.put('/zones/:id', protect, shippingController.updateZone);
router.delete('/zones/:id', protect, shippingController.deleteZone);

module.exports = router;
