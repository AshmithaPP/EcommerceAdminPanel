const express = require('express');
const productController = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const router = express.Router();

// Apply protection to all product routes
// router.use(protect);

// Product core routes
router.post('/', protect, upload.any(), productController.createProduct);
router.get('/', productController.getProducts);
router.get('/:product_id', productController.getProductById);
router.put('/:product_id', protect, upload.any(), productController.updateProduct);
router.delete('/:product_id', protect, productController.deleteProduct);

// Variant routes
router.post('/:product_id/variants', productController.addVariant);
router.put('/variants/:variant_id', productController.updateVariant);
router.delete('/variants/:variant_id', productController.deleteVariant);

// Variant Image routes
router.post('/variants/:variant_id/images', productController.addVariantImage);
router.delete('/variants/images/:image_id', productController.deleteVariantImage);

module.exports = router;
