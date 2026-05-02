const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Get all settings (Open to frontend/admin)
router.get('/', settingsController.getAllSettings);

// Update settings (Admin/Staff access) - supports both PUT and POST
router.put('/', protect, settingsController.updateSettings);
router.post('/', protect, settingsController.updateSettings);

module.exports = router;
