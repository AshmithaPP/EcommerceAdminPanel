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

    getByVariantId: async (variantId, connection = null) => {
        const sql = `SELECT * FROM inventory_levels WHERE variant_id = ?`;
        const executor = connection || db;
        const [rows] = await executor.query(sql, [variantId]);
        return rows[0] || null;
    },

    // === Core Stock Update Logic (Option A: Immediate) ===

    /**
     * Adjusts stock level by a delta and records the history.
     * Actions: ORDER_CREATED, ORDER_CANCELLED, ADMIN_PURCHASE
     */
    adjustStock: async (variantId, delta, action, referenceId = null, reason = null, connection) => {
        if (!connection) {
            throw new Error('A database connection (with transaction) is required for stock updates');
        }

        // 1. Get current stock
        const current = await Inventory.getByVariantId(variantId, connection);
        if (!current) {
            throw new Error(`Inventory not found for variant ${variantId}`);
        }

        const previousStock = current.quantity;
        const newStock = previousStock + delta;

        // 2. Validation: Stock must not go below 0
        if (newStock < 0) {
            throw new Error('Insufficient stock for this operation');
        }

        // 3. Update Inventory
        const updateSql = `UPDATE inventory_levels SET quantity = ?, updated_at = NOW() WHERE variant_id = ?`;
        await connection.query(updateSql, [newStock, variantId]);

        // 4. Record History
        const historyId = uuidv4();
        const historySql = `
            INSERT INTO stock_history (id, variant_id, action, quantity, previous_stock, new_stock, reference_id, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(historySql, [
            historyId,
            variantId,
            action,
            delta,
            previousStock,
            newStock,
            referenceId,
            reason
        ]);

        return { previousStock, newStock, delta };
    },

    /**
     * Sets stock level directly and records the history.
     * Action: ADMIN_SET
     */
    setStock: async (variantId, newStock, reason = null, connection) => {
        if (!connection) {
            throw new Error('A database connection (with transaction) is required for stock updates');
        }

        if (newStock < 0) {
            throw new Error('Stock cannot be set below 0');
        }

        // 1. Get current stock
        const current = await Inventory.getByVariantId(variantId, connection);
        if (!current) {
            throw new Error(`Inventory not found for variant ${variantId}`);
        }

        const previousStock = current.quantity;
        const delta = newStock - previousStock;

        // 2. Update Inventory
        const updateSql = `UPDATE inventory_levels SET quantity = ?, updated_at = NOW() WHERE variant_id = ?`;
        await connection.query(updateSql, [newStock, variantId]);

        // 3. Record History
        const historyId = uuidv4();
        const historySql = `
            INSERT INTO stock_history (id, variant_id, action, quantity, previous_stock, new_stock, reference_id, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(historySql, [
            historyId,
            variantId,
            'ADMIN_SET',
            delta,
            previousStock,
            newStock,
            null,
            reason
        ]);

        return { previousStock, newStock, delta };
    },

    // === Queries ===

    getStockHistory: async (variantId, limit = 50, offset = 0) => {
        const sql = `
            SELECT sh.*, 
                   pv.sku, 
                   p.name as product_name
            FROM stock_history sh
            JOIN product_variants pv ON sh.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            WHERE sh.variant_id = ?
            ORDER BY sh.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await db.query(sql, [variantId, parseInt(limit), parseInt(offset)]);

        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM stock_history WHERE variant_id = ?', [variantId]);

        return { history: rows, total };
    },

    checkAvailability: async (variantId, requiredQuantity) => {
        const inventory = await Inventory.getByVariantId(variantId);
        if (!inventory) {
            return { available: false, reason: 'Variant not found' };
        }

        const isAvailable = inventory.quantity >= requiredQuantity;
        return {
            available: isAvailable,
            currentStock: inventory.quantity,
            requiredQuantity,
            outOfStock: inventory.quantity <= 0,
            lowStock: inventory.quantity <= inventory.low_stock_threshold
        };
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

        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM inventory_levels WHERE quantity <= low_stock_threshold');

        return { items, total };
    },

    updateLowStockThreshold: async (variantId, newThreshold) => {
        const sql = `UPDATE inventory_levels SET low_stock_threshold = ? WHERE variant_id = ?`;
        await db.query(sql, [newThreshold, variantId]);
        return true;
    },

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

        const [[{ total }]] = await db.query(`
            SELECT COUNT(*) as total FROM inventory_levels inv
            JOIN product_variants pv ON inv.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            WHERE p.status = 1
        `);

        return { inventory, total };
    }
};

module.exports = Inventory;
