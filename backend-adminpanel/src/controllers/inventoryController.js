const inventoryService = require('../services/inventoryService');

const inventoryController = {
    // === Get Inventory Information ===

    getInventoryByVariant: async (req, res, next) => {
        try {
            const { variantId } = req.params;
            const inventory = await inventoryService.getInventoryByVariant(variantId);

            res.status(200).json({
                success: true,
                message: 'Inventory retrieved successfully',
                data: inventory
            });
        } catch (error) {
            next(error);
        }
    },

    getFullInventory: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;

            const result = await inventoryService.getFullInventory(page, limit);

            res.status(200).json({
                success: true,
                message: 'Inventory list retrieved successfully',
                data: result.inventory,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    pages: result.pages
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // === Manual Stock Adjustment ===

    manualStockAdjustment: async (req, res, next) => {
        try {
            const { variantId } = req.params;
            const { quantityDelta, reason } = req.body;
            const adminId = req.user.user_id;

            const result = await inventoryService.manualStockAdjustment(
                variantId,
                quantityDelta,
                reason,
                adminId
            );

            res.status(200).json({
                success: true,
                message: 'Stock adjusted successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // === Bulk Stock Update ===

    bulkStockUpdate: async (req, res, next) => {
        try {
            const { updates, reason } = req.body;
            const adminId = req.user.user_id;

            const result = await inventoryService.bulkStockUpdate(
                updates,
                adminId,
                reason || 'Bulk inventory update'
            );

            res.status(200).json({
                success: true,
                message: 'Bulk stock update completed',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // === Low Stock Management ===

    getLowStockItems: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;

            const result = await inventoryService.getLowStockItems(page, limit);

            res.status(200).json({
                success: true,
                message: 'Low stock items retrieved successfully',
                data: result.items,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    pages: result.pages
                }
            });
        } catch (error) {
            next(error);
        }
    },

    updateLowStockThreshold: async (req, res, next) => {
        try {
            const { variantId } = req.params;
            const { threshold } = req.body;

            const result = await inventoryService.updateLowStockThreshold(variantId, threshold);

            res.status(200).json({
                success: true,
                message: 'Low stock threshold updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // === Inventory Logs ===

    getAllInventoryLogs: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 100;

            const filters = {};
            if (req.query.action) filters.action = req.query.action;
            if (req.query.startDate) filters.startDate = req.query.startDate;
            if (req.query.endDate) filters.endDate = req.query.endDate;

            const result = await inventoryService.getAllInventoryLogs(page, limit, filters);

            res.status(200).json({
                success: true,
                message: 'All inventory logs retrieved successfully',
                data: result.logs,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    pages: result.pages
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = inventoryController;
