const express = require('express');
const productController = require('../controllers/productController');
const reviewRoutes = require('./reviewRoutes');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const router = express.Router();

// Apply protection to all product routes
// router.use(protect);

// --- Admin Management APIs ---
router.get('/raw', protect, productController.getProducts); 
router.get('/id/:product_id', protect, productController.getProductById);
router.post('/', protect, upload.any(), productController.createProduct);
router.put('/:product_id', protect, upload.any(), productController.updateProduct);
router.delete('/:product_id', protect, productController.deleteProduct);

// --- User Side / Frontend APIs ---
router.get('/', productController.getProductsFrontend);
router.get('/:slug', productController.getProductBySlug);

// Variant Management
router.post('/:product_id/variants', protect, productController.addVariant);
router.put('/variants/:variant_id', protect, productController.updateVariant);
router.delete('/variants/:variant_id', protect, productController.deleteVariant);

// Variant Image Management
router.post('/variants/:variant_id/images', protect, productController.addVariantImage);
router.delete('/variants/images/:image_id', protect, productController.deleteVariantImage);

// Review Management
router.use('/:product_id/reviews', reviewRoutes);

module.exports = router;
