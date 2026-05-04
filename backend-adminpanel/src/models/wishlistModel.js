const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Wishlist = {
    getWishlist: async (userId, guestId) => {
        let sql = `
            SELECT w.*, p.name as product_name,
                   COALESCE(pv.price, (SELECT MIN(price) FROM product_variants WHERE product_id = p.product_id AND status = 1)) as price,
                   COALESCE(pv.mrp, (SELECT MIN(mrp) FROM product_variants WHERE product_id = p.product_id AND status = 1)) as mrp,
                   (SELECT m.url FROM product_media pm JOIN media m ON pm.media_id = m.media_id WHERE pm.product_id = p.product_id ORDER BY pm.is_primary DESC, pm.sort_order ASC LIMIT 1) as image_url,
                   COALESCE(
                       (SELECT SUM(quantity) FROM inventory_levels WHERE variant_id = w.variant_id),
                       (SELECT SUM(il.quantity) FROM inventory_levels il JOIN product_variants v ON il.variant_id = v.variant_id WHERE v.product_id = p.product_id AND v.status = 1)
                   ) as stock_quantity
            FROM wishlists w
            JOIN products p ON w.product_id = p.product_id
            LEFT JOIN product_variants pv ON w.variant_id = pv.variant_id
            WHERE `;
        
        let params = [];
        if (userId) {
            sql += 'w.user_id = ?';
            params.push(userId);
        } else {
            sql += 'w.guest_id = ?';
            params.push(guestId);
        }
        
        sql += ' ORDER BY w.created_at DESC';
        const [rows] = await db.query(sql, params);
        return rows;
    },

    addItem: async (userId, guestId, productId, variantId) => {
        const wishlistId = uuidv4();
        const sql = 'INSERT IGNORE INTO wishlists (wishlist_id, user_id, guest_id, product_id, variant_id) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [wishlistId, userId || null, guestId || null, productId, variantId || null]);
        return result.affectedRows > 0;
    },

    removeItem: async (userId, guestId, productId, variantId) => {
        let sql = 'DELETE FROM wishlists WHERE product_id = ? AND ';
        let params = [productId];
        
        if (variantId) {
            sql += 'variant_id = ? AND ';
            params.push(variantId);
        } else {
            // If no variantId provided, we remove any entry for this product (Home page behavior)
            // This ensures clicking the heart on Home page always toggles correctly
        }

        if (userId) {
            sql += 'user_id = ?';
            params.push(userId);
        } else {
            sql += 'guest_id = ?';
            params.push(guestId);
        }

        await db.query(sql, params);
    },

    mergeWishlist: async (userId, guestId) => {
        const sql = `
            UPDATE IGNORE wishlists 
            SET user_id = ?, guest_id = NULL 
            WHERE guest_id = ?
        `;
        await db.query(sql, [userId, guestId]);
        // Remove remaining guest items that were duplicates
        await db.query('DELETE FROM wishlists WHERE guest_id = ?', [guestId]);
    }
};

module.exports = Wishlist;
