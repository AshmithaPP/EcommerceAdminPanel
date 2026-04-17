const Inventory = require('../models/inventoryModel');
const Product = require('../models/productModel');
const db = require('../config/database');

const inventoryService = {
    // === Initialize Inventory for New Variant ===
    initializeInventory: async (variantId, quantity = 0, threshold = 10, connection = null) => {
        return await Inventory.createInventory(variantId, quantity, threshold, connection);
    },

    setStockLevel: async (variantId, newQuantity, reason = 'Admin correction', adminId = null, connection = null) => {
        return await Inventory.setQuantity(variantId, newQuantity, reason, adminId, connection);
    },

    // === Get Inventory Information ===

    getInventoryByVariant: async (variantId) => {
        const inventory = await Inventory.getInventoryWithProductDetails(variantId);
        if (!inventory) {
            const error = new Error('Inventory not found for this variant');
            error.statusCode = 404;
            throw error;
        }
        return inventory;
    },

    getFullInventory: async (page = 1, limit = 50) => {
        const offset = (page - 1) * limit;
        const { inventory, total } = await Inventory.getFullInventoryReport(limit, offset);
        return {
            inventory,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    },

    // === Manual Stock Adjustment ===

    manualStockAdjustment: async (variantId, quantityDelta, reason, adminId) => {
        if (!reason || reason.trim().length === 0) {
            const error = new Error('Reason for stock adjustment is required');
            error.statusCode = 400;
            throw error;
        }

        const inventory = await Inventory.getByVariantId(variantId);
        if (!inventory) {
            const error = new Error('Variant not found');
            error.statusCode = 404;
            throw error;
        }

        const result = await Inventory.updateStock(
            variantId,
            quantityDelta,
            reason,
            null,
            'adjustment',
            adminId
        );

        return result;
    },

    // === Bulk Stock Update ===

    bulkStockUpdate: async (updates, adminId, reason = 'Bulk inventory update') => {
        if (!Array.isArray(updates) || updates.length === 0) {
            const error = new Error('Updates must be a non-empty array');
            error.statusCode = 400;
            throw error;
        }

        // Validation
        for (const update of updates) {
            if (!update.variantId || update.quantityDelta === undefined) {
                const error = new Error('Each update must have variantId and quantityDelta');
                error.statusCode = 400;
                throw error;
            }

            const inventory = await Inventory.getByVariantId(update.variantId);
            if (!inventory) {
                const error = new Error(`Variant ${update.variantId} not found`);
                error.statusCode = 404;
                throw error;
            }
        }

        // Execute bulk update
        const results = await Inventory.bulkUpdateStock(updates, adminId, reason);

        return {
            totalUpdates: updates.length,
            successfulUpdates: results.filter(r => r.success).length,
            failedUpdates: results.filter(r => !r.success).length,
            details: results
        };
    },

    // === Low Stock Management ===

    getLowStockItems: async (page = 1, limit = 50) => {
        const offset = (page - 1) * limit;
        const { items, total } = await Inventory.getLowStockItems(limit, offset);
        return {
            items,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    },

    updateLowStockThreshold: async (variantId, newThreshold) => {
        if (newThreshold < 0) {
            const error = new Error('Threshold cannot be negative');
            error.statusCode = 400;
            throw error;
        }

        const inventory = await Inventory.getByVariantId(variantId);
        if (!inventory) {
            const error = new Error('Variant not found');
            error.statusCode = 404;
            throw error;
        }

        await Inventory.updateLowStockThreshold(variantId, newThreshold);
        return {
            success: true,
            message: 'Low stock threshold updated',
            variantId,
            newThreshold
        };
    },

    // === Stock Availability Check ===

    checkStockAvailability: async (variantId, requiredQuantity) => {
        return await Inventory.checkAvailability(variantId, requiredQuantity);
    },

    // === Inventory Logs ===

    getInventoryLogs: async (variantId, page = 1, limit = 50) => {
        const offset = (page - 1) * limit;
        const { logs, total } = await Inventory.getInventoryLogs(variantId, limit, offset);
        return {
            logs,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    },

    getAllInventoryLogs: async (page = 1, limit = 100, filters = {}) => {
        const offset = (page - 1) * limit;
        const { logs, total } = await Inventory.getAllInventoryLogs(limit, offset, filters);
        return {
            logs,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    },

    // === Order Integration ===

    reserveStockForOrder: async (orderItems, orderId, adminId = null, existingConnection = null) => {
        const connection = existingConnection || await db.getConnection();

        try {
            if (!existingConnection) await connection.beginTransaction();

            const reservations = [];

            for (const item of orderItems) {
                const { variant_id, quantity } = item;

                const reservation = await Inventory.reserveStock(
                    variant_id,
                    quantity,
                    orderId,
                    adminId,
                    connection
                );

                reservations.push(reservation);
            }

            if (!existingConnection) await connection.commit();
            return {
                success: true,
                orderId,
                reservations
            };
        } catch (error) {
            if (!existingConnection) await connection.rollback();
            throw error;
        } finally {
            if (!existingConnection) connection.release();
        }
    },

    completeOrderStockDeduction: async (orderItems, orderId, adminId = null, existingConnection = null) => {
        const connection = existingConnection || await db.getConnection();

        try {
            if (!existingConnection) await connection.beginTransaction();

            const deductions = [];

            for (const item of orderItems) {
                const { variant_id, quantity } = item;

                // Get current inventory
                const inventory = await Inventory.getByVariantId(variant_id);
                if (!inventory) {
                    throw new Error(`Inventory not found for variant ${variant_id}`);
                }

                // Deduct reserved quantity from actual quantity
                const updateSql = `
                    UPDATE inventory_levels
                    SET quantity = quantity - ?,
                        reserved_quantity = reserved_quantity - ?,
                        updated_at = NOW()
                    WHERE variant_id = ?
                `;
                await connection.query(updateSql, [quantity, quantity, variant_id]);

                await Inventory.logChange(
                    inventory.inventory_id,
                    variant_id,
                    'order_confirmed',
                    inventory.quantity,
                    -quantity,
                    inventory.quantity - quantity,
                    inventory.reserved_quantity,
                    -quantity,
                    inventory.reserved_quantity - quantity,
                    'Stock deducted - order confirmed',
                    orderId,
                    'order',
                    adminId,
                    connection
                );

                deductions.push({
                    variantId: variant_id,
                    quantityDeducted: quantity
                });
            }

            if (!existingConnection) await connection.commit();
            return {
                success: true,
                orderId,
                deductions
            };
        } catch (error) {
            if (!existingConnection) await connection.rollback();
            throw error;
        } finally {
            if (!existingConnection) connection.release();
        }
    },

    cancelOrderAndRestoreStock: async (orderItems, orderId, adminId = null, existingConnection = null) => {
        const connection = existingConnection || await db.getConnection();

        try {
            if (!existingConnection) await connection.beginTransaction();

            const restorations = [];

            for (const item of orderItems) {
                const { variant_id, quantity } = item;

                const restoration = await Inventory.releaseReservedStock(
                    variant_id,
                    quantity,
                    orderId,
                    adminId,
                    connection
                );

                restorations.push(restoration);
            }

            if (!existingConnection) await connection.commit();
            return {
                success: true,
                orderId,
                restorations
            };
        } catch (error) {
            if (!existingConnection) await connection.rollback();
            throw error;
        } finally {
            if (!existingConnection) connection.release();
        }
    }
};

module.exports = inventoryService;
