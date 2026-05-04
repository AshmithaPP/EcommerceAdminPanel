const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', blogController.getAllBlogs);
router.get('/:slug', blogController.getBlogBySlug);

// Protected routes (for admin)
router.post('/', protect, authorize('admin', 'superadmin'), blogController.createBlog);
router.get('/admin/:id', protect, authorize('admin', 'superadmin'), blogController.getBlogById);
router.put('/:id', protect, authorize('admin', 'superadmin'), blogController.updateBlog);
router.delete('/:id', protect, authorize('admin', 'superadmin'), blogController.deleteBlog);

module.exports = router;
