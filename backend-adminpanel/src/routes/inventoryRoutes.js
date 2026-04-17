const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { protect } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const {
    manualStockAdjustmentSchema,
    bulkStockUpdateSchema,
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

// Manual stock adjustment for a variant
router.post('/variants/:variantId/adjust', validate(manualStockAdjustmentSchema), inventoryController.manualStockAdjustment);

// Bulk stock update for multiple variants
router.post('/bulk-update', validate(bulkStockUpdateSchema), inventoryController.bulkStockUpdate);

// Get low stock items
router.get('/low-stock', inventoryController.getLowStockItems);

// Update low stock threshold for a variant
router.patch('/variants/:variantId/threshold', validate(updateLowStockThresholdSchema), inventoryController.updateLowStockThreshold);

// Get all inventory logs with optional filters
router.get('/logs', inventoryController.getAllInventoryLogs);

module.exports = router;
