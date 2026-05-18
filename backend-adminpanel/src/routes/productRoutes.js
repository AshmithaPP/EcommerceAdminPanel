const express = require('express');
const productController = require('../controllers/productController');
const reviewRoutes = require('./reviewRoutes');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const router = express.Router();

// Apply protection to all product routes
// router.use(protect);

// --- Admin Management APIs ---
const { checkPermission } = require('../middlewares/authMiddleware');

router.get('/raw', protect, checkPermission('products', 'view'), productController.getProducts); 
router.get('/check-slug/:slug', protect, checkPermission('products', 'view'), productController.checkSlug);
router.get('/id/:product_id', protect, checkPermission('products', 'view'), productController.getProductById);
router.post('/', protect, checkPermission('products', 'add'), upload.any(), productController.createProduct);
router.put('/:product_id', protect, checkPermission('products', 'edit'), upload.any(), productController.updateProduct);
router.delete('/:product_id', protect, checkPermission('products', 'delete'), productController.deleteProduct);

// --- User Side / Frontend APIs ---
router.get('/', productController.getProductsFrontend);
router.get('/:slug', productController.getProductBySlug);

// Variant Management
router.post('/:product_id/variants', protect, checkPermission('products', 'add'), productController.addVariant);
router.put('/variants/:variant_id', protect, checkPermission('products', 'edit'), productController.updateVariant);
router.delete('/variants/:variant_id', protect, checkPermission('products', 'delete'), productController.deleteVariant);

// Variant Image Management
router.post('/variants/:variant_id/images', protect, checkPermission('products', 'add'), productController.addVariantImage);
router.delete('/variants/images/:image_id', protect, checkPermission('products', 'delete'), productController.deleteVariantImage);

// Review Management
router.use('/:product_id/reviews', reviewRoutes);

module.exports = router;
