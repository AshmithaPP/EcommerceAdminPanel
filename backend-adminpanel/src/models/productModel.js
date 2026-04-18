const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Product = {
    // === Product Core ===
    create: async (productData, connection = db) => {
        const { product_id, name, slug, description, sub_category_id, brand, video_url, gstPercent } = productData;
        const sql = `
            INSERT INTO products (product_id, name, slug, description, sub_category_id, brand, video_url, gstPercent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(sql, [product_id, name, slug, description, sub_category_id, brand, video_url || null, gstPercent || 0]);
        return product_id;
    },

    findAll: async (limit = 10, offset = 0) => {
        const sql = `
            SELECT p.*, sc.name as sub_category_name, c.name as category_name,
                   (SELECT vi.image_url 
                    FROM product_variants pv 
                    JOIN variant_images vi ON pv.variant_id = vi.variant_id 
                    WHERE pv.product_id = p.product_id 
                    ORDER BY vi.is_primary DESC, vi.created_at ASC 
                    LIMIT 1) as image,
                   (SELECT vi.thumbnail_url 
                    FROM product_variants pv 
                    JOIN variant_images vi ON pv.variant_id = vi.variant_id 
                    WHERE pv.product_id = p.product_id 
                    ORDER BY vi.is_primary DESC, vi.created_at ASC 
                    LIMIT 1) as thumbnail,
                   (SELECT SUM(COALESCE(inv.quantity, 0))
                    FROM product_variants pv
                    LEFT JOIN inventory_levels inv ON pv.variant_id = inv.variant_id
                    WHERE pv.product_id = p.product_id AND pv.status = 1) as total_stock,
                   (SELECT MIN(sellingPrice) 
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
                   (SELECT MIN(sellingPrice) 
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
        const { name, slug, description, sub_category_id, brand, status, video_url, gstPercent } = productData;
        const sql = `
            UPDATE products 
            SET name = ?, slug = ?, description = ?, sub_category_id = ?, brand = ?, status = ?, video_url = ?, gstPercent = ?
            WHERE product_id = ?
        `;
        await connection.query(sql, [
            name, slug, description, sub_category_id, brand, 
            status !== undefined ? status : 1, video_url || null, gstPercent || 0, productId
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
        const { variant_id, product_id, sku, price, mrp, sellingPrice } = variantData;
        const sql = `
            INSERT INTO product_variants (variant_id, product_id, sku, price, mrp, sellingPrice)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await connection.query(sql, [variant_id, product_id, sku, price, mrp || 0, sellingPrice || 0]);
        return variant_id;
    },

    getVariants: async (productId) => {
        const sql = `
            SELECT v.*, inv.quantity as stock
            FROM product_variants v
            LEFT JOIN inventory_levels inv ON v.variant_id = inv.variant_id
            WHERE v.product_id = ? AND v.status = 1
        `;
        const [variants] = await db.query(sql, [productId]);

        for (let variant of variants) {
            variant.attributes = await Product.getVariantAttributes(variant.variant_id);
            variant.images = await Product.getVariantImages(variant.variant_id);
            
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
            SELECT v.*, inv.quantity as stock
            FROM product_variants v
            LEFT JOIN inventory_levels inv ON v.variant_id = inv.variant_id
            WHERE v.variant_id = ? AND v.status = 1
        `;
        const [rows] = await db.query(sql, [variantId]);
        if (rows.length === 0) return null;
        
        const variant = rows[0];
        variant.attributes = await Product.getVariantAttributes(variantId);
        variant.images = await Product.getVariantImages(variantId);

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
        const { sku, price, status, mrp, sellingPrice } = variantData;
        const sql = `
            UPDATE product_variants 
            SET sku = ?, price = ?, status = ?, mrp = ?, sellingPrice = ?
            WHERE variant_id = ?
        `;
        await connection.query(sql, [
            sku, price, status !== undefined ? status : 1, mrp || 0, sellingPrice || 0, variantId
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

    // === Variant Images ===
    addVariantImages: async (variantId, images, connection = db) => {
        if (!images || images.length === 0) return;
        
        const values = images
            .filter(img => img.image_url) // Defensive: skip if image_url is missing
            .map(img => [
                uuidv4(),
                variantId,
                img.image_url,
                img.thumbnail_url || null,
                img.mini_thumbnail_url || null,
                img.width || null,
                img.height || null,
                img.file_size || null,
                img.format || null,
                img.is_primary || false
            ]);
        
        if (values.length === 0) return;

        const sql = 'INSERT INTO variant_images (image_id, variant_id, image_url, thumbnail_url, mini_thumbnail_url, width, height, file_size, format, is_primary) VALUES ?';
        await connection.query(sql, [values]);
    },

    addVariantImage: async (variantId, imageData, connection = db) => {
        const { image_url, thumbnail_url, mini_thumbnail_url, width, height, file_size, format, is_primary } = imageData;
        const imageId = uuidv4();
        const sql = 'INSERT INTO variant_images (image_id, variant_id, image_url, thumbnail_url, mini_thumbnail_url, width, height, file_size, format, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await connection.query(sql, [imageId, variantId, image_url, thumbnail_url || null, mini_thumbnail_url || null, width || null, height || null, file_size || null, format || null, is_primary || false]);
        return imageId;
    },

    deleteVariantImage: async (imageId, connection = db) => {
        await connection.query('DELETE FROM variant_images WHERE image_id = ?', [imageId]);
    },

    deleteVariantImages: async (variantId, connection = db) => {
        await connection.query('DELETE FROM variant_images WHERE variant_id = ?', [variantId]);
    },

    getVariantImages: async (variantId) => {
        const sql = 'SELECT * FROM variant_images WHERE variant_id = ? ORDER BY is_primary DESC, created_at ASC';
        const [rows] = await db.query(sql, [variantId]);
        return rows;
    },

    clearPrimaryImages: async (variantId, connection = db) => {
        await connection.query('UPDATE variant_images SET is_primary = FALSE WHERE variant_id = ?', [variantId]);
    }
};

module.exports = Product;
