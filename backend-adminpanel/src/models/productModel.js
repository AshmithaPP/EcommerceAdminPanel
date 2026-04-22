const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const Product = {
    // === Product Core ===
    create: async (productData, connection = db) => {
        const { product_id, name, slug, description, sub_category_id, brand, video_url, gstPercent, priceIncludesGST, base_sku, variant_config, meta_title, meta_description } = productData;
        const sql = `
            INSERT INTO products (product_id, name, slug, description, sub_category_id, brand, video_url, gstPercent, priceIncludesGST, base_sku, variant_config, meta_title, meta_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(sql, [
            product_id, name, slug, description, sub_category_id, brand, 
            video_url || null, gstPercent || 0, priceIncludesGST !== undefined ? priceIncludesGST : 1,
            base_sku || null, variant_config ? JSON.stringify(variant_config) : null,
            meta_title || null, meta_description || null
        ]);
        return product_id;
    },

    findAll: async (limit = 10, offset = 0) => {
        const sql = `
            SELECT p.*, sc.name as sub_category_name, c.name as category_name,
                   (SELECT m.url 
                    FROM product_media pm
                    JOIN media m ON pm.media_id = m.media_id
                    WHERE pm.product_id = p.product_id 
                    ORDER BY pm.is_primary DESC, pm.sort_order ASC 
                    LIMIT 1) as image,
                   (SELECT m.thumbnail_url 
                    FROM product_media pm
                    JOIN media m ON pm.media_id = m.media_id
                    WHERE pm.product_id = p.product_id 
                    ORDER BY pm.is_primary DESC, pm.sort_order ASC 
                    LIMIT 1) as thumbnail,
                   (SELECT SUM(COALESCE(inv.quantity, 0))
                    FROM product_variants pv
                    LEFT JOIN inventory_levels inv ON pv.variant_id = inv.variant_id
                    WHERE pv.product_id = p.product_id AND pv.status = 1) as total_stock,
                   (SELECT COUNT(*)
                    FROM product_variants pv
                    JOIN inventory_levels inv ON pv.variant_id = inv.variant_id
                    WHERE pv.product_id = p.product_id 
                      AND pv.status = 1 
                      AND inv.quantity <= inv.low_stock_threshold 
                      AND inv.quantity > 0) as low_stock_count,
                   (SELECT COUNT(*)
                    FROM product_variants pv
                    JOIN inventory_levels inv ON pv.variant_id = inv.variant_id
                    WHERE pv.product_id = p.product_id 
                      AND pv.status = 1 
                      AND inv.quantity <= 0) as out_of_stock_count,
                   (SELECT MIN(COALESCE(NULLIF(finalPrice, 0), NULLIF(sellingPrice, 0), price)) 
                    FROM product_variants 
                    WHERE product_id = p.product_id AND status = 1) as starting_price
            FROM products p
            LEFT JOIN sub_categories sc ON p.sub_category_id = sc.sub_category_id
            LEFT JOIN categories c ON sc.category_id = c.category_id
            WHERE p.status = 1
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await db.query(sql, [parseInt(limit), parseInt(offset)]);
        
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM products WHERE status = 1');
        return { products: rows, total };
    },

    findById: async (productId) => {
        const sql = `
            SELECT p.*, sc.name as sub_category_name, c.name as category_name,
                   (SELECT MIN(COALESCE(NULLIF(finalPrice, 0), NULLIF(sellingPrice, 0), price)) 
                    FROM product_variants 
                    WHERE product_id = p.product_id AND status = 1) as starting_price
            FROM products p
            LEFT JOIN sub_categories sc ON p.sub_category_id = sc.sub_category_id
            LEFT JOIN categories c ON sc.category_id = c.category_id
            WHERE p.product_id = ? AND p.status = 1
        `;
        const [rows] = await db.query(sql, [productId]);
        if (rows.length === 0) return null;

        const product = rows[0];
        
        // Parse variant_config if it's a string
        if (product.variant_config && typeof product.variant_config === 'string') {
            try {
                product.variant_config = JSON.parse(product.variant_config);
            } catch (e) {
                console.error('Error parsing variant_config:', e);
            }
        }
        
        // Fetch Variants
        const variants = await Product.getVariants(productId);
        product.variants = variants;

        return product;
    },

    findBySlug: async (slug) => {
        const [rows] = await db.query('SELECT * FROM products WHERE slug = ?', [slug]);
        return rows[0];
    },

    update: async (productId, productData, connection = db) => {
        const { name, slug, description, sub_category_id, brand, status, video_url, gstPercent, priceIncludesGST, base_sku, variant_config, meta_title, meta_description } = productData;
        const sql = `
            UPDATE products 
            SET name = ?, slug = ?, description = ?, sub_category_id = ?, brand = ?, status = ?, video_url = ?, gstPercent = ?, priceIncludesGST = ?, base_sku = ?, variant_config = ?, meta_title = ?, meta_description = ?
            WHERE product_id = ?
        `;
        await connection.query(sql, [
            name, slug, description, sub_category_id, brand, 
            status !== undefined ? status : 1, video_url || null, gstPercent || 0, 
            priceIncludesGST !== undefined ? priceIncludesGST : 1,
            base_sku || null, variant_config ? JSON.stringify(variant_config) : null,
            meta_title || null, meta_description || null,
            productId
        ]);
    },

    softDelete: async (productId, connection = db) => {
        const timestamp = Date.now();
        // 1. Rename product slug and set status = 0
        await connection.query(
            'UPDATE products SET slug = CONCAT(slug, "-deleted-", ?), status = 0 WHERE product_id = ?', 
            [timestamp, productId]
        );
        // 2. Rename all associated variant SKUs and set status = 0
        await connection.query(
            'UPDATE product_variants SET sku = CONCAT(sku, "-deleted-", ?), status = 0 WHERE product_id = ?', 
            [timestamp, productId]
        );
    },

    softDeleteVariant: async (variantId, connection = db) => {
        const timestamp = Date.now();
        await connection.query(
            'UPDATE product_variants SET sku = CONCAT(sku, "-deleted-", ?), status = 0 WHERE variant_id = ?', 
            [timestamp, variantId]
        );
    },

    // === Variants ===
    addVariant: async (variantData, connection = db) => {
        const { variant_id, product_id, sku, price, mrp, sellingPrice, basePrice, gstAmount, finalPrice } = variantData;
        const sql = `
            INSERT INTO product_variants (variant_id, product_id, sku, price, mrp, sellingPrice, basePrice, gstAmount, finalPrice)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(sql, [variant_id, product_id, sku, price, mrp || 0, sellingPrice || 0, basePrice || 0, gstAmount || 0, finalPrice || 0]);
        return variant_id;
    },

    getVariants: async (productId) => {
        const sql = `
            SELECT v.*, inv.quantity as stock, inv.low_stock_threshold
            FROM product_variants v
            LEFT JOIN inventory_levels inv ON v.variant_id = inv.variant_id
            WHERE v.product_id = ? AND v.status = 1
        `;
        const [variants] = await db.query(sql, [productId]);

        for (let variant of variants) {
            variant.attributes = await Product.getVariantAttributes(variant.variant_id);
            // New Fallback Logic: Get media for this variant with context
            variant.images = await Product.getVariantMedia(variant.variant_id, productId, variant.attributes);
            
            // Map back to legacy frontend name if needed
            variant.images = variant.images.map(img => ({ ...img, image_url: img.url }));

            // Dynamic discount calculation
            if (variant.mrp > 0 && variant.sellingPrice > 0) {
                variant.discountPercentage = Math.round(((variant.mrp - variant.sellingPrice) / variant.mrp) * 100);
            } else {
                variant.discountPercentage = 0;
            }
        }

        return variants;
    },

    getVariantById: async (variantId) => {
        const sql = `
            SELECT v.*, inv.quantity as stock, inv.low_stock_threshold
            FROM product_variants v
            LEFT JOIN inventory_levels inv ON v.variant_id = inv.variant_id
            WHERE v.variant_id = ? AND v.status = 1
        `;
        const [rows] = await db.query(sql, [variantId]);
        if (rows.length === 0) return null;
        
        const variant = rows[0];
        variant.attributes = await Product.getVariantAttributes(variantId);
        variant.images = await Product.getVariantMedia(variantId, variant.product_id, variant.attributes);
        
        // Map back to legacy frontend name if needed
        variant.images = variant.images.map(img => ({ ...img, image_url: img.url }));

        // Dynamic discount calculation
        if (variant.mrp > 0 && variant.sellingPrice > 0) {
            variant.discountPercentage = Math.round(((variant.mrp - variant.sellingPrice) / variant.mrp) * 100);
        } else {
            variant.discountPercentage = 0;
        }

        return variant;
    },

    findVariantBySku: async (sku) => {
        const [rows] = await db.query('SELECT * FROM product_variants WHERE sku = ?', [sku]);
        return rows[0];
    },

    updateVariant: async (variantId, variantData, connection = db) => {
        const { sku, price, status, mrp, sellingPrice, basePrice, gstAmount, finalPrice } = variantData;
        const sql = `
            UPDATE product_variants 
            SET sku = ?, price = ?, status = ?, mrp = ?, sellingPrice = ?, basePrice = ?, gstAmount = ?, finalPrice = ?
            WHERE variant_id = ?
        `;
        await connection.query(sql, [
            sku, price, status !== undefined ? status : 1, mrp || 0, sellingPrice || 0, basePrice || 0, gstAmount || 0, finalPrice || 0, variantId
        ]);
    },

    softDeleteVariant: async (variantId, connection = db) => {
        await connection.query('UPDATE product_variants SET status = 0 WHERE variant_id = ?', [variantId]);
    },

    // === Variant Attributes ===
    addVariantAttributes: async (variantId, attributes, connection = db) => {
        if (!attributes || attributes.length === 0) return;
        
        const values = attributes.map(attr => [
            uuidv4(),
            variantId,
            attr.attribute_id,
            attr.attribute_value_id
        ]);
        
        const sql = 'INSERT INTO variant_attributes (variant_attribute_id, variant_id, attribute_id, attribute_value_id) VALUES ?';
        await connection.query(sql, [values]);
    },

    deleteVariantAttributes: async (variantId, connection = db) => {
        await connection.query('DELETE FROM variant_attributes WHERE variant_id = ?', [variantId]);
    },

    getVariantAttributes: async (variantId) => {
        const sql = `
            SELECT va.*, a.name as attribute_name, av.value as attribute_value
            FROM variant_attributes va
            JOIN attributes a ON va.attribute_id = a.attribute_id
            JOIN attribute_values av ON va.attribute_value_id = av.attribute_value_id
            WHERE va.variant_id = ?
        `;
        const [rows] = await db.query(sql, [variantId]);
        return rows;
    },

    // === Media System (V2) ===
    findOrCreateMedia: async (mediaData, connection = db) => {
        const url = mediaData.url || mediaData.image_url;
        let hash = mediaData.hash;
        
        if (!url) {
            console.error('Failed findOrCreateMedia: Missing URL in mediaData', mediaData);
            throw new Error('Media URL is required and cannot be null');
        }
        
        // If hash is missing, generate a deterministic one from URL
        if (!hash) {
            hash = crypto.createHash('sha256').update(url).digest('hex');
        }

        const { width, height, file_size, format } = mediaData;
        
        // 1. Check if hash exists
        const [existing] = await connection.query('SELECT media_id FROM media WHERE hash = ?', [hash]);
        if (existing.length > 0) return existing[0].media_id;

        // 2. Insert if not exists
        const media_id = uuidv4();
        const thumb = mediaData.thumbnail_url || mediaData.thumb_url || null;
        const mini = mediaData.mini_thumbnail_url || mediaData.mini_url || null;

        await connection.query(`
            INSERT INTO media (media_id, url, hash, thumbnail_url, mini_thumbnail_url, width, height, file_size, format)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            media_id, url, hash, 
            thumb, mini, 
            width || null, height || null, file_size || null, format || null
        ]);
        return media_id;
    },

    addProductMedia: async (productId, mediaId, isPrimary = 0, sortOrder = 0, connection = db) => {
        await connection.query(`
            INSERT IGNORE INTO product_media (product_id, media_id, is_primary, sort_order)
            VALUES (?, ?, ?, ?)
        `, [productId, mediaId, isPrimary, sortOrder]);
    },

    addVariantMedia: async (variantId, mediaId, isPrimary = 0, sortOrder = 0, connection = db) => {
        await connection.query(`
            INSERT IGNORE INTO variant_media (variant_id, media_id, is_primary, sort_order)
            VALUES (?, ?, ?, ?)
        `, [variantId, mediaId, isPrimary, sortOrder]);
    },

    addAttributeMedia: async (productId, attrId, attrValId, mediaId, connection = db) => {
        await connection.query(`
            INSERT IGNORE INTO attribute_media (product_id, attribute_id, attribute_value_id, media_id)
            VALUES (?, ?, ?, ?)
        `, [productId, attrId, attrValId, mediaId]);
    },

    getVariantMedia: async (variantId, productId, attributes = [], connection = db) => {
        // Exclusive Fallback Logic: Only show the "best" available level.
        // If Variant images exist -> Show ONLY Variant.
        // ELSE IF Attribute images exist -> Show ONLY Attribute.
        // ELSE -> Show Product images.
        
        const sql = `
            SELECT m.*, combined.source, combined.is_primary, combined.sort_order, combined.priority
            FROM (
                SELECT vm.media_id, 'variant' as source, vm.is_primary, vm.sort_order, 1 as priority 
                FROM variant_media vm WHERE vm.variant_id = ?
                UNION ALL
                SELECT am.media_id, 'attribute' as source, 0 as is_primary, 0 as sort_order, 2 as priority
                FROM attribute_media am WHERE am.product_id = ? AND (am.attribute_id, am.attribute_value_id) IN (?)
                UNION ALL
                SELECT pm.media_id, 'product' as source, pm.is_primary, pm.sort_order, 3 as priority
                FROM product_media pm WHERE pm.product_id = ?
            ) as combined
            JOIN media m ON combined.media_id = m.media_id
            WHERE combined.priority = (
                SELECT MIN(priority) FROM (
                    SELECT 1 as priority FROM variant_media WHERE variant_id = ?
                    UNION ALL
                    SELECT 2 FROM attribute_media WHERE product_id = ? AND (attribute_id, attribute_value_id) IN (?)
                    UNION ALL
                    SELECT 3 FROM product_media WHERE product_id = ?
                ) as p_check
            )
            ORDER BY combined.is_primary DESC, combined.sort_order ASC
        `;
        
        const attrTuples = (attributes && attributes.length > 0) ? attributes.map(a => [a.attribute_id, a.attribute_value_id]) : [['NONE', 'NONE']];
        const [rows] = await connection.query(sql, [
            variantId, productId, attrTuples, productId, 
            variantId, productId, attrTuples, productId
        ]);
        return rows;
    },

    deleteProductMedia: async (productId, connection = db) => {
        await connection.query('DELETE FROM product_media WHERE product_id = ?', [productId]);
    },

    deleteVariantMedia: async (variantId, connection = db) => {
        await connection.query('DELETE FROM variant_media WHERE variant_id = ?', [variantId]);
    },

    deleteAttributeMedia: async (productId, connection = db) => {
        await connection.query('DELETE FROM attribute_media WHERE product_id = ?', [productId]);
    },

    // Bridge for legacy code/sync
    getVariantImages: async (variantId) => {
        const sql = `
            SELECT m.* 
            FROM variant_media vm
            JOIN media m ON vm.media_id = m.media_id
            WHERE vm.variant_id = ?
        `;
        const [rows] = await db.query(sql, [variantId]);
        return rows.map(r => ({ ...r, image_url: r.url }));
    }
};

module.exports = Product;
