const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Cart = {
    // Find cart by user_id or guest_id
    findCart: async (userId, guestId) => {
        let sql = 'SELECT * FROM carts WHERE ';
        let params = [];
        if (userId) {
            sql += 'user_id = ?';
            params.push(userId);
        } else {
            sql += 'guest_id = ?';
            params.push(guestId);
        }
        const [rows] = await db.query(sql, params);
        return rows[0];
    },

    createCart: async (userId, guestId) => {
        const cartId = uuidv4();
        const sql = 'INSERT INTO carts (cart_id, user_id, guest_id) VALUES (?, ?, ?)';
        await db.query(sql, [cartId, userId || null, guestId || null]);
        return cartId;
    },

    getCartItems: async (cartId) => {
        const sql = `
            SELECT ci.*, p.name as product_name, pv.sku, pv.price as current_price, pv.mrp,
                   (SELECT m.url FROM product_media pm JOIN media m ON pm.media_id = m.media_id WHERE pm.product_id = p.product_id ORDER BY pm.is_primary DESC, pm.sort_order ASC LIMIT 1) as image_url,
                   (SELECT SUM(quantity) FROM inventory_levels WHERE variant_id = ci.variant_id) as stock_quantity
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.product_id
            JOIN product_variants pv ON ci.variant_id = pv.variant_id
            WHERE ci.cart_id = ?
        `;
        const [rows] = await db.query(sql, [cartId]);
        return rows;
    },

    getCartItem: async (cartId, variantId) => {
        const sql = 'SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?';
        const [rows] = await db.query(sql, [cartId, variantId]);
        return rows[0];
    },

    addItem: async (cartId, productId, variantId, quantity, price) => {
        const cartItemId = uuidv4();
        const sql = 'INSERT INTO cart_items (cart_item_id, cart_id, product_id, variant_id, quantity, price_at_added) VALUES (?, ?, ?, ?, ?, ?)';
        await db.query(sql, [cartItemId, cartId, productId, variantId, quantity, price]);
        return cartItemId;
    },

    updateItemQuantity: async (cartItemId, quantity) => {
        const sql = 'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?';
        await db.query(sql, [quantity, cartItemId]);
    },

    removeItem: async (cartItemId) => {
        const sql = 'DELETE FROM cart_items WHERE cart_item_id = ?';
        await db.query(sql, [cartItemId]);
    },

    clearCart: async (cartId) => {
        const sql = 'DELETE FROM cart_items WHERE cart_id = ?';
        await db.query(sql, [cartId]);
    },

    // Get attributes for a variant
    getVariantAttributes: async (variantId) => {
        const sql = `
            SELECT a.name as attr_name, av.value as attr_value, av.color_code
            FROM variant_attributes va
            JOIN attributes a ON va.attribute_id = a.attribute_id
            JOIN attribute_values av ON va.attribute_value_id = av.attribute_value_id
            WHERE va.variant_id = ?
        `;
        const [rows] = await db.query(sql, [variantId]);
        return rows;
    },

    // Merge guest cart into user cart
    mergeCarts: async (guestCartId, userCartId) => {
        // Implementation will handle duplicates in service
    }
};

module.exports = Cart;
