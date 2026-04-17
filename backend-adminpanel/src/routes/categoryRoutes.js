const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

router.post('/category-create', categoryController.createCategory);
router.get('/category-list', categoryController.getCategories);
router.get('/category-tree', categoryController.getCategoryTree);
router.get('/category-view/:category_id', categoryController.getCategoryById);
router.put('/category-update/:category_id', categoryController.updateCategory);
router.delete('/category-delete/:category_id', categoryController.deleteCategory);

// Category-Attribute Mapping
router.post('/category-attribute-assign/:category_id', categoryController.assignAttributes);
router.get('/category-attribute-get/:category_id', categoryController.getCategoryAttributes);
router.delete('/category-attribute-unassign/:category_id/:attribute_id', categoryController.unassignAttribute);

module.exports = router;
