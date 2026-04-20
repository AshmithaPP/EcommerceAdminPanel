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

    // === Admin Operations ===

    restock: async (req, res, next) => {
        try {
            const { variantId } = req.params;
            const { quantity, reason } = req.body;
            const adminId = req.user.user_id;

            const result = await inventoryService.restockStock(
                variantId,
                quantity,
                reason || 'Admin restock',
                adminId,
                req.body.threshold
            );

            res.status(200).json({
                success: true,
                message: 'Stock restocked successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    setStockLevel: async (req, res, next) => {
        try {
            const { variantId } = req.params;
            const { stock, reason } = req.body;
            const adminId = req.user.user_id;

            const result = await inventoryService.setStockLevel(
                variantId,
                stock,
                reason || 'Admin correction',
                adminId,
                req.body.threshold
            );

            res.status(200).json({
                success: true,
                message: 'Stock level set successfully',
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

    // === History Retrieval ===

    getStockHistory: async (req, res, next) => {
        try {
            const { variantId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;

            const result = await inventoryService.getStockHistory(variantId, page, limit);

            res.status(200).json({
                success: true,
                message: 'Stock history retrieved successfully',
                data: result.history,
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
