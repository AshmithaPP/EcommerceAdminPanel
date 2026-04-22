const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Get all settings (Open to frontend/admin)
router.get('/', settingsController.getAllSettings);

// Update settings (Admin only) - supports both PUT and POST
router.put('/', protect, authorize('admin', 'superadmin'), settingsController.updateSettings);
router.post('/', protect, authorize('admin', 'superadmin'), settingsController.updateSettings);

module.exports = router;
