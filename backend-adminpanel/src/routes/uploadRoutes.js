const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const upload = require('../middlewares/uploadMiddleware');
const { protect } = require('../middlewares/authMiddleware');

// Route for single image upload
router.post('/single', protect, upload.single('image'), uploadController.uploadImage);

// Route for multiple images upload
router.post('/multiple', protect, upload.array('images', 10), uploadController.uploadMultipleImages);

module.exports = router;
