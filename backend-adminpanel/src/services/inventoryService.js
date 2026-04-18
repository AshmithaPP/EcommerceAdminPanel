const Inventory = require('../models/inventoryModel');
const db = require('../config/database');

const inventoryService = {
    // === Initialize Inventory for New Variant ===
    initializeInventory: async (variantId, quantity = 0, threshold = 10, connection = null) => {
        return await Inventory.createInventory(variantId, quantity, threshold, connection);
    },

    // === Admin Operations ===

    /**
     * Set stock level to an absolute value.
     * Log: ADMIN_SET
     */
    setStockLevel: async (variantId, newStock, reason = 'Admin set', adminId = null, connection = null) => {
        const conn = connection || await db.getConnection();
        try {
            if (!connection) await conn.beginTransaction();

            const result = await Inventory.setStock(variantId, newStock, reason, conn);

            if (!connection) await conn.commit();
            return result;
        } catch (error) {
            if (!connection) await conn.rollback();
            throw error;
        } finally {
            if (!connection) conn.release();
        }
    },

    /**
     * Add stock (replenishment).
     * Log: ADMIN_PURCHASE
     */
    restockStock: async (variantId, quantity, reason = 'Admin restock', adminId = null, connection = null) => {
        const conn = connection || await db.getConnection();
        try {
            if (!connection) await conn.beginTransaction();

            const result = await Inventory.adjustStock(variantId, Math.abs(quantity), 'ADMIN_PURCHASE', null, reason, conn);

            if (!connection) await conn.commit();
            return result;
        } catch (error) {
            if (!connection) await conn.rollback();
            throw error;
        } finally {
            if (!connection) conn.release();
        }
    },

    // === Order Integration (Option A: Immediate) ===

    /**
     * Reduce stock immediately when an order is created.
     * Log: ORDER_CREATED
     */
    reduceStockForOrder: async (orderItems, orderId, connection = null) => {
        const conn = connection || await db.getConnection();
        try {
            if (!connection) await conn.beginTransaction();

            const results = [];
            for (const item of orderItems) {
                const { variant_id, quantity } = item;
                const result = await Inventory.adjustStock(
                    variant_id, 
                    -Math.abs(quantity), 
                    'ORDER_CREATED', 
                    orderId, 
                    'Order created', 
                    conn
                );
                results.push(result);
            }

            if (!connection) await conn.commit();
            return { success: true, orderId, results };
        } catch (error) {
            if (!connection) await conn.rollback();
            throw error;
        } finally {
            if (!connection) conn.release();
        }
    },

    /**
     * Restore stock immediately when an order is cancelled.
     * Log: ORDER_CANCELLED
     */
    restoreStockForOrder: async (orderItems, orderId, connection = null) => {
        const conn = connection || await db.getConnection();
        try {
            if (!connection) await conn.beginTransaction();

            const results = [];
            for (const item of orderItems) {
                const { variant_id, quantity } = item;
                const result = await Inventory.adjustStock(
                    variant_id, 
                    Math.abs(quantity), 
                    'ORDER_CANCELLED', 
                    orderId, 
                    'Order cancelled', 
                    conn
                );
                results.push(result);
            }

            if (!connection) await conn.commit();
            return { success: true, orderId, results };
        } catch (error) {
            if (!connection) await conn.rollback();
            throw error;
        } finally {
            if (!connection) conn.release();
        }
    },

    // === Queries ===

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

    getStockHistory: async (variantId, page = 1, limit = 50) => {
        const offset = (page - 1) * limit;
        const { history, total } = await Inventory.getStockHistory(variantId, limit, offset);
        return {
            history,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    },

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
            throw new Error('Threshold cannot be negative');
        }

        const inventory = await Inventory.getByVariantId(variantId);
        if (!inventory) {
            const error = new Error('Variant not found');
            error.statusCode = 404;
            throw error;
        }

        await Inventory.updateLowStockThreshold(variantId, newThreshold);
        return { success: true, variantId, newThreshold };
    },

    checkStockAvailability: async (variantId, requiredQuantity) => {
        return await Inventory.checkAvailability(variantId, requiredQuantity);
    }
};

module.exports = inventoryService;

module.exports = inventoryService;
