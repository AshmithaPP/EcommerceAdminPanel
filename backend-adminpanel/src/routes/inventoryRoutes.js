const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { protect } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const {
    restockSchema,
    setStockSchema,
    updateLowStockThresholdSchema
} = require('../validators/inventoryValidator');

const router = express.Router();

// Apply protection to all inventory routes
router.use(protect);

// === Inventory Management Routes ===

// Get all inventory variants with pagination
router.get('/variants', inventoryController.getFullInventory);

// Get specific variant inventory details
router.get('/variants/:variantId', inventoryController.getInventoryByVariant);

// Get stock history for a variant
router.get('/variants/:variantId/history', inventoryController.getStockHistory);

// Restock (Add stock)
router.post('/variants/:variantId/restock', validate(restockSchema), inventoryController.restock);

// Set absolute stock level
router.post('/variants/:variantId/set-stock', validate(setStockSchema), inventoryController.setStockLevel);

// Get low stock items
router.get('/low-stock', inventoryController.getLowStockItems);

// Update low stock threshold for a variant
router.patch('/variants/:variantId/threshold', validate(updateLowStockThresholdSchema), inventoryController.updateLowStockThreshold);

module.exports = router;
