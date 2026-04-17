const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Inventory = {
    // === Inventory Level Operations ===

    createInventory: async (variantId, quantity = 0, threshold = 10, connection = null) => {
        const inventoryId = uuidv4();
        const sql = `
            INSERT INTO inventory_levels (inventory_id, variant_id, quantity, low_stock_threshold)
            VALUES (?, ?, ?, ?)
        `;
        const executor = connection || db;
        await executor.query(sql, [inventoryId, variantId, parseInt(quantity), parseInt(threshold)]);
        return inventoryId;
    },

    getByVariantId: async (variantId) => {
        const sql = `
            SELECT * FROM inventory_levels
            WHERE variant_id = ?
        `;
        const [rows] = await db.query(sql, [variantId]);
        return rows[0] || null;
    },

    getById: async (inventoryId) => {
        const sql = `
            SELECT * FROM inventory_levels
            WHERE inventory_id = ?
        `;
        const [rows] = await db.query(sql, [inventoryId]);
        return rows[0] || null;
    },

    getInventoryWithProductDetails: async (variantId) => {
        const sql = `
            SELECT
                inv.*,
                pv.product_id,
                pv.sku,
                pv.price,
                p.name as product_name,
                p.slug
            FROM inventory_levels inv
            JOIN product_variants pv ON inv.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            WHERE inv.variant_id = ?
        `;
        const [rows] = await db.query(sql, [variantId]);
        return rows[0] || null;
    },

    // === Stock Update Operations ===

    updateStock: async (
        variantId,
        quantityDelta,
        reason = null,
        referenceId = null,
        referenceType = null,
        adminId = null,
        connection = db
    ) => {
        // Get current inventory
        const current = await Inventory.getByVariantId(variantId);
        if (!current) {
            const error = new Error('Inventory not found for this variant');
            error.statusCode = 404;
            throw error;
        }

        const quantityBefore = current.quantity;
        const quantityAfter = Math.max(0, quantityBefore + quantityDelta);

        // Update inventory level
        const updateSql = `
            UPDATE inventory_levels
            SET quantity = ?, updated_at = NOW()
            WHERE variant_id = ?
        `;
        await connection.query(updateSql, [quantityAfter, variantId]);

        // Log the change
        await Inventory.logChange(
            current.inventory_id,
            variantId,
            'manual_adjustment',
            quantityBefore,
            quantityDelta,
            quantityAfter,
            0,
            0,
            0,
            reason,
            referenceId,
            referenceType,
            adminId,
            connection
        );

        return {
            inventoryId: current.inventory_id,
            variantId,
            quantityBefore,
            quantityAfter,
            quantityDelta
        };
    },

    setQuantity: async (
        variantId,
        newQuantity,
        reason = 'Admin correction',
        adminId = null,
        connection = db
    ) => {
        const current = await Inventory.getByVariantId(variantId);
        if (!current) {
            const error = new Error('Inventory not found for this variant');
            error.statusCode = 404;
            throw error;
        }

        const quantityBefore = current.quantity;
        const quantityDelta = newQuantity - quantityBefore;

        // Update inventory level
        const updateSql = `
            UPDATE inventory_levels
            SET quantity = ?, updated_at = NOW()
            WHERE variant_id = ?
        `;
        await connection.query(updateSql, [newQuantity, variantId]);

        // Log the change
        await Inventory.logChange(
            current.inventory_id,
            variantId,
            'manual_adjustment',
            quantityBefore,
            quantityDelta,
            newQuantity,
            current.reserved_quantity,
            0,
            current.reserved_quantity,
            reason,
            null,
            'set_absolute',
            adminId,
            connection
        );

        return {
            inventoryId: current.inventory_id,
            variantId,
            quantityBefore,
            quantityAfter: newQuantity,
            quantityDelta
        };
    },

    // === Reserved Quantity Operations (for pending orders) ===

    reserveStock: async (variantId, quantity, referenceId, adminId = null, connection = db) => {
        const current = await Inventory.getByVariantId(variantId);
        if (!current) {
            const error = new Error('Inventory not found for this variant');
            error.statusCode = 404;
            throw error;
        }

        if (current.available_quantity < quantity) {
            const error = new Error('Insufficient stock to reserve');
            error.statusCode = 409;
            throw error;
        }

        const reservedBefore = current.reserved_quantity;
        const reservedAfter = reservedBefore + quantity;

        const updateSql = `
            UPDATE inventory_levels
            SET reserved_quantity = reserved_quantity + ?, updated_at = NOW()
            WHERE variant_id = ?
        `;
        await connection.query(updateSql, [quantity, variantId]);

        await Inventory.logChange(
            current.inventory_id,
            variantId,
            'order_placed',
            current.quantity,
            0,
            current.quantity,
            reservedBefore,
            quantity,
            reservedAfter,
            'Stock reserved for order',
            referenceId,
            'order',
            adminId,
            connection
        );

        return {
            variantId,
            quantityReserved: quantity,
            availableAfter: current.available_quantity - quantity
        };
    },

    releaseReservedStock: async (variantId, quantity, referenceId, adminId = null, connection = db) => {
        const current = await Inventory.getByVariantId(variantId);
        if (!current) {
            const error = new Error('Inventory not found for this variant');
            error.statusCode = 404;
            throw error;
        }

        if (current.reserved_quantity < quantity) {
            const error = new Error('Cannot release more than reserved quantity');
            error.statusCode = 409;
            throw error;
        }

        const reservedBefore = current.reserved_quantity;
        const reservedAfter = Math.max(0, reservedBefore - quantity);

        const updateSql = `
            UPDATE inventory_levels
            SET reserved_quantity = reserved_quantity - ?, updated_at = NOW()
            WHERE variant_id = ?
        `;
        await connection.query(updateSql, [quantity, variantId]);

        await Inventory.logChange(
            current.inventory_id,
            variantId,
            'order_cancelled',
            current.quantity,
            0,
            current.quantity,
            reservedBefore,
            -quantity,
            reservedAfter,
            'Stock released - order cancelled',
            referenceId,
            'order',
            adminId,
            connection
        );

        return {
            variantId,
            quantityReleased: quantity,
            availableAfter: current.available_quantity + quantity
        };
    },

    // === Bulk Operations ===

    bulkUpdateStock: async (updates, adminId, reason = 'Bulk inventory update') => {
        const results = [];

        for (const update of updates) {
            const { variantId, quantityDelta } = update;
            try {
                const result = await Inventory.updateStock(
                    variantId,
                    quantityDelta,
                    reason,
                    null,
                    'bulk_adjustment',
                    adminId
                );
                results.push({ success: true, ...result });
            } catch (error) {
                results.push({
                    success: false,
                    variantId,
                    error: error.message
                });
            }
        }

        return results;
    },

    // === Stock Availability Check ===

    checkAvailability: async (variantId, requiredQuantity) => {
        const inventory = await Inventory.getByVariantId(variantId);
        if (!inventory) {
            return {
                available: false,
                reason: 'Variant not found'
            };
        }

        const isAvailable = inventory.available_quantity >= requiredQuantity;
        return {
            available: isAvailable,
            currentQuantity: inventory.quantity,
            reservedQuantity: inventory.reserved_quantity,
            availableQuantity: inventory.available_quantity,
            requiredQuantity,
            outOfStock: inventory.quantity <= 0,
            lowStock: inventory.quantity <= inventory.low_stock_threshold
        };
    },

    // === Logging Operations ===

    logChange: async (
        inventoryId,
        variantId,
        action,
        quantityBefore,
        quantityDelta,
        quantityAfter,
        reservedBefore,
        reservedDelta,
        reservedAfter,
        reason = null,
        referenceId = null,
        referenceType = null,
        adminId = null,
        connection = db
    ) => {
        const logId = uuidv4();
        const sql = `
            INSERT INTO inventory_logs (
                log_id, inventory_id, variant_id, action,
                quantity_before, quantity_delta, quantity_after,
                reserved_before, reserved_delta, reserved_after,
                reason, reference_id, reference_type, admin_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(sql, [
            logId,
            inventoryId,
            variantId,
            action,
            quantityBefore,
            quantityDelta,
            quantityAfter,
            reservedBefore,
            reservedDelta,
            reservedAfter,
            reason,
            referenceId,
            referenceType,
            adminId
        ]);

        return logId;
    },

    getInventoryLogs: async (variantId, limit = 50, offset = 0) => {
        const sql = `
            SELECT il.*, u.name as admin_name, u.email as admin_email
            FROM inventory_logs il
            LEFT JOIN users u ON il.admin_id = u.user_id
            WHERE il.variant_id = ?
            ORDER BY il.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [logs] = await db.query(sql, [variantId, parseInt(limit), parseInt(offset)]);

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) as total FROM inventory_logs WHERE variant_id = ?',
            [variantId]
        );

        return { logs, total };
    },

    getAllInventoryLogs: async (limit = 100, offset = 0, filters = {}) => {
        let sql = `
            SELECT il.*,
                   u.name as admin_name,
                   pv.sku,
                   p.name as product_name
            FROM inventory_logs il
            LEFT JOIN users u ON il.admin_id = u.user_id
            LEFT JOIN product_variants pv ON il.variant_id = pv.variant_id
            LEFT JOIN products p ON pv.product_id = p.product_id
            WHERE 1=1
        `;
        const params = [];

        if (filters.variantId) {
            sql += ' AND il.variant_id = ?';
            params.push(filters.variantId);
        }

        if (filters.action) {
            sql += ' AND il.action = ?';
            params.push(filters.action);
        }

        if (filters.startDate) {
            sql += ' AND DATE(il.created_at) >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            sql += ' AND DATE(il.created_at) <= ?';
            params.push(filters.endDate);
        }

        sql += ' ORDER BY il.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await db.query(sql, params);

        const countSql = 'SELECT COUNT(*) as total FROM inventory_logs WHERE 1=1';
        const countParams = [];
        let countQuery = countSql;

        if (filters.variantId) {
            countQuery += ' AND variant_id = ?';
            countParams.push(filters.variantId);
        }

        if (filters.action) {
            countQuery += ' AND action = ?';
            countParams.push(filters.action);
        }

        const [[{ total }]] = await db.query(countQuery, countParams);

        return { logs, total };
    },

    // === Low Stock Queries (on-the-fly) ===

    getLowStockItems: async (limit = 50, offset = 0) => {
        const sql = `
            SELECT
                inv.*,
                pv.sku,
                pv.product_id,
                p.name as product_name,
                p.slug
            FROM inventory_levels inv
            JOIN product_variants pv ON inv.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            WHERE inv.quantity <= inv.low_stock_threshold
            ORDER BY inv.quantity ASC
            LIMIT ? OFFSET ?
        `;
        const [items] = await db.query(sql, [parseInt(limit), parseInt(offset)]);

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) as total FROM inventory_levels WHERE quantity <= low_stock_threshold'
        );

        return { items, total };
    },

    // === Threshold Management ===

    updateLowStockThreshold: async (variantId, newThreshold) => {
        const sql = `
            UPDATE inventory_levels
            SET low_stock_threshold = ?
            WHERE variant_id = ?
        `;
        await db.query(sql, [newThreshold, variantId]);
        return true;
    },

    // === General Queries ===

    getFullInventoryReport: async (limit = 50, offset = 0) => {
        const sql = `
            SELECT
                inv.*,
                pv.product_id,
                pv.sku,
                pv.price,
                p.name as product_name,
                p.slug
            FROM inventory_levels inv
            JOIN product_variants pv ON inv.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            WHERE p.status = 1
            ORDER BY p.name, pv.sku
            LIMIT ? OFFSET ?
        `;
        const [inventory] = await db.query(sql, [parseInt(limit), parseInt(offset)]);

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM inventory_levels inv
             JOIN product_variants pv ON inv.variant_id = pv.variant_id
             JOIN products p ON pv.product_id = p.product_id
             WHERE p.status = 1`
        );

        return { inventory, total };
    },

    getInventorySummary: async () => {
        const sql = `
            SELECT
                COUNT(*) as total_variants,
                SUM(quantity) as total_quantity,
                SUM(reserved_quantity) as total_reserved,
                SUM(available_quantity) as total_available,
                SUM(IF(quantity <= low_stock_threshold, 1, 0)) as low_stock_count,
                SUM(IF(quantity <= 0, 1, 0)) as out_of_stock_count
            FROM inventory_levels
        `;
        const [[summary]] = await db.query(sql);
        return summary;
    }
};

module.exports = Inventory;
