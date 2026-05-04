const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const SubCategory = require('../models/subCategoryModel');
const Attribute = require('../models/attributeModel');
const inventoryService = require('./inventoryService');
const db = require('../config/database');
const slugify = require('../utils/slugify');
const { v4: uuidv4 } = require('uuid');
const { formatProductList, formatProductDetail } = require('../utils/productFormatter');

function calculateGSTFields(sellingPrice, gstPercent, priceIncludesGST) {
    const sp = parseFloat(sellingPrice) || 0;
    const gst = parseFloat(gstPercent) || 0;
    const includesGST = priceIncludesGST === false || priceIncludesGST === 0 || priceIncludesGST === '0' || priceIncludesGST === 'false' ? false : true;

    if (includesGST) {
        const basePrice = parseFloat((sp / (1 + gst / 100)).toFixed(2));
        const gstAmount = parseFloat((sp - basePrice).toFixed(2));
        // Ensure we return the EXACT selling price provided as the finalPrice
        return { basePrice, gstAmount, finalPrice: sp };
    } else {
        const gstAmount = parseFloat((sp * (gst / 100)).toFixed(2));
        const finalPrice = parseFloat((sp + gstAmount).toFixed(2));
        return { basePrice: sp, gstAmount, finalPrice };
    }
}

const productService = {
    createProduct: async (productData) => {
        const {
            name, sub_category_id, brand, variants, gstPercent, priceIncludesGST,
            base_sku, meta_title, meta_description,
            badge, tagline
        } = productData;

        // Extract JSON fields with support for both camelCase and snake_case
        const variant_config = productData.variantConfig || productData.variant_config || null;
        const pricing_meta = productData.pricingMeta || productData.pricing_meta || null;
        const stock_meta = productData.stockMeta || productData.stock_meta || null;
        const services = productData.services || productData.services || null;
        const trust_badges = productData.trustBadges || productData.trust_badges || null;
        const highlights = productData.highlights || productData.highlights || null;
        const care_instructions = productData.careInstructions || productData.care_instructions || null;
        const additional_info = productData.additionalInfo || productData.additional_info || null;
        const origin_info = productData.originInfo || productData.origin_info || null;
        const stats = productData.stats || productData.stats || null;

        // 0. Validation: Basic Identity
        if (!name || name.trim() === '') {
            const error = new Error('Product name is required');
            error.statusCode = 400;
            throw error;
        }

        // 1. Validation: Sub-Category
        const subCategory = await SubCategory.findById(sub_category_id);
        if (!subCategory) {
            const error = new Error('Invalid sub-category ID');
            error.statusCode = 400;
            throw error;
        }

        // 2. Generate Unique Slug
        let slug = slugify(name);
        const existingBySlug = await Product.findBySlug(slug);
        if (existingBySlug) {
            slug = `${slug}-${Date.now()}`;
        }

        // 3. Validation: Variants & Attributes
        if (!variants || variants.length === 0) {
            const error = new Error('At least one variant is required');
            error.statusCode = 400;
            throw error;
        }

        // Get allowed attributes for sub-category
        const allowedMapping = await SubCategory.getAttributesFlat(sub_category_id);
        // Map of attr_id -> Set of value_ids
        const attrMap = {};
        allowedMapping.forEach(m => {
            if (!attrMap[m.attribute_id]) attrMap[m.attribute_id] = new Set();
            if (m.attribute_value_id) attrMap[m.attribute_id].add(m.attribute_value_id);
        });

        const skus = new Set();
        for (const variant of variants) {
            // Check SKU uniqueness in payload
            if (skus.has(variant.sku)) {
                const error = new Error(`Duplicate SKU in request: ${variant.sku}`);
                error.statusCode = 400;
                throw error;
            }
            skus.add(variant.sku);

            // Validate SKU uniqueness in DB
            const existingSku = await Product.findVariantBySku(variant.sku);
            if (existingSku) {
                const error = new Error(`SKU already exists: ${variant.sku}`);
                error.statusCode = 400;
                throw error;
            }

            // Validate Pricing
            if (!variant.mrp || variant.mrp <= 0) {
                const error = new Error(`MRP must be greater than 0 for SKU: ${variant.sku}`);
                error.statusCode = 400;
                throw error;
            }
            if (!variant.sellingPrice || variant.sellingPrice <= 0) {
                const error = new Error(`Selling Price must be greater than 0 for SKU: ${variant.sku}`);
                error.statusCode = 400;
                throw error;
            }
            if (parseFloat(variant.sellingPrice) > parseFloat(variant.mrp)) {
                const error = new Error(`Selling Price cannot be greater than MRP for SKU: ${variant.sku}`);
                error.statusCode = 400;
                throw error;
            }

            // Validate Attributes
            if (variant.attributes) {
                const usedAttrIds = new Set();
                for (const attr of variant.attributes) {
                    if (usedAttrIds.has(attr.attribute_id)) {
                        const error = new Error(`Duplicate attribute ${attr.attribute_id} in variant SKU: ${variant.sku}`);
                        error.statusCode = 400;
                        throw error;
                    }
                    usedAttrIds.add(attr.attribute_id);

                    // Validate attribute belongs to category
                    if (!attrMap[attr.attribute_id]) {
                        const error = new Error(`Attribute ${attr.attribute_id} is not mapped to this category`);
                        error.statusCode = 400;
                        throw error;
                    }
                    // Validate value belongs to attribute
                    if (!attrMap[attr.attribute_id].has(attr.attribute_value_id)) {
                        const error = new Error(`Attribute value ${attr.attribute_value_id} is not valid for attribute ${attr.attribute_id}`);
                        error.statusCode = 400;
                        throw error;
                    }
                }
            }
        }

        const productId = uuidv4();
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Insert Product
            await Product.create({
                product_id: productId,
                name,
                slug,
                description: productData.description || '',
                sub_category_id,
                brand,
                video_url: productData.video_url || null,
                gstPercent: gstPercent || 0,
                priceIncludesGST: priceIncludesGST !== undefined ? priceIncludesGST : 1,
                base_sku: base_sku || null,
                variant_config: variant_config,
                meta_title: meta_title || null,
                meta_description: meta_description || null,
                badge: badge || null,
                tagline: tagline || null,
                pricing_meta,
                stock_meta,
                services,
                trust_badges,
                highlights,
                care_instructions,
                additional_info,
                origin_info,
                stats,
                is_featured: productData.is_featured
            }, connection);

            // 1.1 Sync Home Sections
            if (productData.home_sections) {
                await Product.syncHomeSections(productId, productData.home_sections, connection);
            }

            // 2. Insert Variants
            for (const variantData of variants) {
                const variantId = uuidv4();
                const gstFields = calculateGSTFields(variantData.sellingPrice, gstPercent, priceIncludesGST);
                await Product.addVariant({
                    variant_id: variantId,
                    product_id: productId,
                    sku: variantData.sku,
                    price: variantData.sellingPrice, // Use sellingPrice for legacy price field
                    mrp: variantData.mrp,
                    sellingPrice: variantData.sellingPrice,
                    ...gstFields
                }, connection);

                // Initialize Inventory for the new variant
                await inventoryService.initializeInventory(variantId, variantData.initial_stock || 0, variantData.low_stock_threshold || 5, connection);

                // Insert Variant Attributes
                if (variantData.attributes && variantData.attributes.length > 0) {
                    await Product.addVariantAttributes(variantId, variantData.attributes, connection);
                }

                // Insert Variant Media (Mappings)
                if (variantData.images && variantData.images.length > 0) {
                    const validImages = variantData.images.filter(img => img.url || img.image_url);
                    for (const img of validImages) {
                        const mediaId = await Product.findOrCreateMedia(img, connection);
                        await Product.addVariantMedia(variantId, mediaId, img.is_primary || 0, img.sort_order || 0, connection);
                    }
                }
            }

            // 3. Handle Product-Level Media (Visual Assets)
            if (productData.images && productData.images.length > 0) {
                const validImages = productData.images.filter(img => img.url || img.image_url);
                for (const img of validImages) {
                    const mediaId = await Product.findOrCreateMedia(img, connection);
                    await Product.addProductMedia(productId, mediaId, img.is_primary || 0, img.sort_order || 0, connection);
                }
            }

            // 4. Handle Attribute-Level Media (Specialized Mappings)
            if (productData.attribute_images && productData.attribute_images.length > 0) {
                for (const am of productData.attribute_images) {
                    const mediaId = await Product.findOrCreateMedia(am, connection);
                    await Product.addAttributeMedia(productId, am.attribute_id, am.attribute_value_id, mediaId, connection);
                }
            }

            await connection.commit();
            return { product_id: productId, slug };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getProducts: async (page = 1, limit = 10) => {
        const offset = (page - 1) * limit;
        return await Product.findAll(limit, offset);
    },

    getProductById: async (productId) => {
        const product = await Product.findById(productId);
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }
        product.home_sections = await Product.getHomeSections(productId);
        return product;
    },

    getProductsFrontend: async (query) => {
        const {
            category,
            page = 1,
            limit = 12,
            min_price,
            max_price,
            rating,
            sort = 'newest',
            search,
            color,
            pattern,
            occasion,
            fabric,
            stock_status // 'in_stock' or null
        } = query;

        const offset = (page - 1) * limit;
        const params = [];
        let whereClauses = ['p.status = 1'];

        // 1. Category Filter (Multi-select Slug or ID support)
        if (category) {
            const catSlugs = category.split(',').map(s => s.trim());
            whereClauses.push(`(
                c.slug IN (${catSlugs.map(() => '?').join(',')}) OR 
                c.category_id IN (${catSlugs.map(() => '?').join(',')}) OR 
                sc.slug IN (${catSlugs.map(() => '?').join(',')}) OR 
                sc.sub_category_id IN (${catSlugs.map(() => '?').join(',')})
            )`);
            params.push(...catSlugs, ...catSlugs, ...catSlugs, ...catSlugs);
        }

        // 2. Search Filter
        if (search) {
            whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        // 3. Dynamic Attribute Filters (Slug-based, AND logic between attributes)
        const attrFilters = { color, pattern, occasion, fabric };
        Object.keys(attrFilters).forEach(key => {
            if (attrFilters[key]) {
                const slugs = attrFilters[key].split(',').map(s => s.trim().toLowerCase());
                whereClauses.push(`(
                    p.product_id IN (
                        SELECT pav.product_id 
                        FROM product_attribute_values pav
                        JOIN attributes a ON pav.attribute_id = a.attribute_id
                        JOIN attribute_values av ON pav.attribute_value_id = av.attribute_value_id
                        WHERE a.name = ? AND av.slug IN (${slugs.map(() => '?').join(',')})
                    ) OR p.product_id IN (
                        SELECT pv2.product_id 
                        FROM product_variants pv2
                        JOIN variant_attributes va ON pv2.variant_id = va.variant_id
                        JOIN attributes a ON va.attribute_id = a.attribute_id
                        JOIN attribute_values av ON va.attribute_value_id = av.attribute_value_id
                        WHERE a.name = ? AND av.slug IN (${slugs.map(() => '?').join(',')})
                    )
                )`);
                params.push(key, ...slugs, key, ...slugs);
            }
        });

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 4. Subquery for Prices and Stock
        const priceJoinSql = `
            JOIN (
                SELECT 
                    product_id, 
                    MIN(COALESCE(NULLIF(finalPrice, 0), NULLIF(sellingPrice, 0), price)) as starting_price, 
                    MAX(mrp) as max_mrp,
                    SUM(COALESCE((SELECT quantity FROM inventory_levels WHERE variant_id = pv_inner.variant_id), 0)) as total_stock
                FROM product_variants pv_inner
                WHERE status = 1
                GROUP BY product_id
            ) pp ON p.product_id = pp.product_id
        `;

        // Add secondary filters (Price, Rating, Stock)
        let finalWhereSql = whereSql;
        if (min_price || max_price || rating || stock_status === 'in_stock') {
            const extraClauses = [];
            if (min_price) { extraClauses.push('pp.starting_price >= ?'); params.push(parseFloat(min_price)); }
            if (max_price) { extraClauses.push('pp.starting_price <= ?'); params.push(parseFloat(max_price)); }
            if (rating) { extraClauses.push('(SELECT AVG(rating) FROM product_reviews WHERE product_id = p.product_id AND status = 1) >= ?'); params.push(parseFloat(rating)); }
            if (stock_status === 'in_stock') { extraClauses.push('pp.total_stock > 0'); }
            
            finalWhereSql += (finalWhereSql ? ' AND ' : 'WHERE ') + extraClauses.join(' AND ');
        }

        // Sorting
        let orderBy = 'p.created_at DESC';
        if (sort === 'price_low_to_high') orderBy = 'pp.starting_price ASC';
        else if (sort === 'price_high_to_low') orderBy = 'pp.starting_price DESC';
        else if (sort === 'popularity') {
            // Popularity = (Avg Rating * 10) + (Review Count * 2) + (0.5 * Stock level)
            orderBy = `(
                COALESCE((SELECT AVG(rating) FROM product_reviews WHERE product_id = p.product_id AND status = 1), 0) * 10 + 
                COALESCE((SELECT COUNT(*) FROM product_reviews WHERE product_id = p.product_id AND status = 1), 0) * 2
            ) DESC`;
        }

        // 5. Execute Count Query
        const countSql = `SELECT COUNT(DISTINCT p.product_id) as total FROM products p 
                          LEFT JOIN sub_categories sc ON p.sub_category_id = sc.sub_category_id
                          LEFT JOIN categories c ON sc.category_id = c.category_id
                          ${priceJoinSql} ${finalWhereSql}`;
        const [[{ total }]] = await db.query(countSql, params);

        // 6. Execute Main Query
        const productsSql = `
            SELECT p.*, c.name as category_name, pp.starting_price, pp.total_stock,
                   (SELECT m.url FROM product_media pm JOIN media m ON pm.media_id = m.media_id WHERE pm.product_id = p.product_id ORDER BY pm.is_primary DESC LIMIT 1) as image_url,
                   (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.product_id AND status = 1) as rating,
                   (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.product_id AND status = 1) as rating_count
            FROM products p
            LEFT JOIN sub_categories sc ON p.sub_category_id = sc.sub_category_id
            LEFT JOIN categories c ON sc.category_id = c.category_id
            ${priceJoinSql}
            ${finalWhereSql}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        
        const [rows] = await db.query(productsSql, [...params, parseInt(limit), parseInt(offset)]);

        // 7. Fetch Dynamic Filters (Amazon/Flipkart Style - Multi-select safe)
        // We calculate each facet by ignoring its own active filter but respecting others.
        
        const getFacetWhere = (ignoreKey) => {
            let clauses = ['p.status = 1'];
            let facetParams = [];
            
            if (category) {
                clauses.push('(c.slug = ? OR c.category_id = ? OR sc.slug = ? OR sc.sub_category_id = ?)');
                facetParams.push(category, category, category, category);
            }
            if (search) {
                clauses.push('(p.name LIKE ? OR p.description LIKE ?)');
                facetParams.push(`%${search}%`, `%${search}%`);
            }

            Object.keys(attrFilters).forEach(key => {
                if (attrFilters[key] && key !== ignoreKey) {
                    const slugs = attrFilters[key].split(',').map(s => s.trim().toLowerCase());
                    clauses.push(`(
                        p.product_id IN (
                            SELECT pav.product_id FROM product_attribute_values pav
                            JOIN attributes a ON pav.attribute_id = a.attribute_id
                            JOIN attribute_values av ON pav.attribute_value_id = av.attribute_value_id
                            WHERE a.name = ? AND av.slug IN (${slugs.map(() => '?').join(',')})
                        ) OR p.product_id IN (
                            SELECT pv2.product_id FROM product_variants pv2
                            JOIN variant_attributes va ON pv2.variant_id = va.variant_id
                            JOIN attributes a ON va.attribute_id = a.attribute_id
                            JOIN attribute_values av ON va.attribute_value_id = av.attribute_value_id
                            WHERE a.name = ? AND av.slug IN (${slugs.map(() => '?').join(',')})
                        )
                    )`);
                    facetParams.push(key, ...slugs, key, ...slugs);
                }
            });
            return { sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params: facetParams };
        };

        const fetchFacet = async (attrName) => {
            const { sql: fWhere, params: fParams } = getFacetWhere(attrName);
            const [results] = await db.query(`
                SELECT attr_value, attr_slug, COUNT(DISTINCT product_id) as count
                FROM (
                    SELECT av.value as attr_value, av.slug as attr_slug, p.product_id
                    FROM products p
                    LEFT JOIN sub_categories sc ON p.sub_category_id = sc.sub_category_id
                    LEFT JOIN categories c ON sc.category_id = c.category_id
                    JOIN product_attribute_values pav ON p.product_id = pav.product_id
                    JOIN attributes a ON pav.attribute_id = a.attribute_id
                    JOIN attribute_values av ON pav.attribute_value_id = av.attribute_value_id
                    ${fWhere} AND a.name = ?
                    UNION
                    SELECT av.value as attr_value, av.slug as attr_slug, p.product_id
                    FROM products p
                    LEFT JOIN sub_categories sc ON p.sub_category_id = sc.sub_category_id
                    LEFT JOIN categories c ON sc.category_id = c.category_id
                    JOIN product_variants pv ON p.product_id = pv.product_id
                    JOIN variant_attributes va ON pv.variant_id = va.variant_id
                    JOIN attributes a ON va.attribute_id = a.attribute_id
                    JOIN attribute_values av ON va.attribute_value_id = av.attribute_value_id
                    ${fWhere} AND a.name = ?
                ) as combined_attrs
                GROUP BY attr_value, attr_slug
                ORDER BY count DESC
            `, [...fParams, attrName, ...fParams, attrName]);
            return results.map(r => ({ name: r.attr_value, slug: r.attr_slug, count: r.count }));
        };

        const fetchFacetCategories = async () => {
            const { sql: fWhere, params: fParams } = getFacetWhere('category');
            const [results] = await db.query(`
                SELECT c.name as cat_name, c.slug as cat_slug, COUNT(DISTINCT p.product_id) as count
                FROM products p
                LEFT JOIN sub_categories sc ON p.sub_category_id = sc.sub_category_id
                LEFT JOIN categories c ON sc.category_id = c.category_id
                ${fWhere}
                GROUP BY c.name, c.slug
                HAVING count > 0
                ORDER BY count DESC
            `, fParams);
            return results.map(r => ({ name: r.cat_name, slug: r.cat_slug, count: r.count }));
        };

        // Price bounds (respects category and search only, or all attributes? Usually category+search)
        const { sql: pWhere, params: pParams } = getFacetWhere('price');
        const [[priceBounds]] = await db.query(`
            SELECT MIN(pp.starting_price) as min, MAX(pp.starting_price) as max
            FROM products p
            LEFT JOIN sub_categories sc ON p.sub_category_id = sc.sub_category_id
            LEFT JOIN categories c ON sc.category_id = c.category_id
            ${priceJoinSql}
            ${pWhere}
        `, pParams);

        const [categories, colors, patterns, occasions, fabrics] = await Promise.all([
            fetchFacetCategories(),
            fetchFacet('color'),
            fetchFacet('pattern'),
            fetchFacet('occasion'),
            fetchFacet('fabric')
        ]);

        return {
            products: rows.map(p => ({
                product_id: p.product_id,
                product_name: p.name,
                slug: p.slug,
                price: p.starting_price,
                original_price: p.starting_price * 1.2,
                rating: p.rating || 0,
                reviews_count: p.rating_count || 0,
                image_url: p.image_url,
                stock_status: p.total_stock > 0 ? 'in_stock' : 'out_of_stock'
            })),
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_products: total
            },
            filters: {
                price_range: priceBounds || { min: 0, max: 0 },
                categories,
                colors,
                patterns,
                occasions,
                fabrics
            }
        };
    },

    getProductBySlug: async (slug) => {
        const product = await Product.findBySlug(slug);
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        // Get subcategory attribute mapping to distinguish variant vs specification
        const subCategoryAttributes = await SubCategory.getAttributesFlat(product.sub_category_id);

        // Fetch related products (with category-level fallback)
        const relatedProducts = await Product.getRelatedProducts(product.sub_category_id, product.category_id, product.product_id);

        const home_sections = await Product.getHomeSections(product.product_id);

        return formatProductDetail({ ...product, home_sections }, product.variants, subCategoryAttributes, relatedProducts);
    },

    updateProduct: async (productId, productData) => {
        const existing = await Product.findById(productId);
        if (!existing) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        const {
            name, sub_category_id, brand, video_url, gstPercent, priceIncludesGST,
            base_sku, meta_title, meta_description,
            badge, tagline
        } = productData;

        // Extract JSON fields with support for both camelCase and snake_case, falling back to existing
        const variant_config = productData.variantConfig !== undefined ? productData.variantConfig : 
                              (productData.variant_config !== undefined ? productData.variant_config : existing.variant_config);
        const pricing_meta = productData.pricingMeta !== undefined ? productData.pricingMeta : 
                             (productData.pricing_meta !== undefined ? productData.pricing_meta : existing.pricing_meta);
        const stock_meta = productData.stockMeta !== undefined ? productData.stockMeta : 
                            (productData.stock_meta !== undefined ? productData.stock_meta : existing.stock_meta);
        const services = productData.services !== undefined ? productData.services : 
                         (productData.services !== undefined ? productData.services : existing.services);
        const trust_badges = productData.trustBadges !== undefined ? productData.trustBadges : 
                             (productData.trust_badges !== undefined ? productData.trust_badges : existing.trust_badges);
        const highlights = productData.highlights !== undefined ? productData.highlights : 
                           (productData.highlights !== undefined ? productData.highlights : existing.highlights);
        const care_instructions = productData.careInstructions !== undefined ? productData.careInstructions : 
                                  (productData.care_instructions !== undefined ? productData.care_instructions : existing.care_instructions);
        const additional_info = productData.additionalInfo !== undefined ? productData.additionalInfo : 
                                (productData.additional_info !== undefined ? productData.additional_info : existing.additional_info);
        const origin_info = productData.originInfo !== undefined ? productData.originInfo : 
                            (productData.origin_info !== undefined ? productData.origin_info : existing.origin_info);
        const stats = productData.stats !== undefined ? productData.stats : 
                      (productData.stats !== undefined ? productData.stats : existing.stats);

        // Validation: Sub-Category
        const targetSubCategoryId = sub_category_id || existing.sub_category_id;
        if (sub_category_id && sub_category_id !== existing.sub_category_id) {
            const subCategory = await SubCategory.findById(sub_category_id);
            if (!subCategory) {
                const error = new Error('Invalid sub-category ID');
                error.statusCode = 400;
                throw error;
            }
        }

        // Handle Slug
        let slug = existing.slug;
        if (name && name !== existing.name) {
            slug = slugify(name);
            const existingBySlug = await Product.findBySlug(slug);
            if (existingBySlug && existingBySlug.product_id !== productId) {
                slug = `${slug}-${Date.now()}`;
            }
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Update Core Product
            await Product.update(productId, {
                name: name || existing.name,
                slug,
                description: productData.description !== undefined ? productData.description : existing.description,
                sub_category_id: targetSubCategoryId,
                brand: brand || existing.brand,
                video_url: video_url !== undefined ? video_url : existing.video_url,
                gstPercent: gstPercent !== undefined ? gstPercent : existing.gstPercent,
                priceIncludesGST: priceIncludesGST !== undefined ? priceIncludesGST : existing.priceIncludesGST,
                base_sku: base_sku !== undefined ? base_sku : existing.base_sku,
                variant_config: variant_config,
                meta_title: meta_title !== undefined ? meta_title : existing.meta_title,
                meta_description: meta_description !== undefined ? meta_description : existing.meta_description,
                badge: badge !== undefined ? badge : existing.badge,
                tagline: tagline !== undefined ? tagline : existing.tagline,
                pricing_meta,
                stock_meta,
                services,
                trust_badges,
                highlights,
                care_instructions,
                additional_info,
                origin_info,
                stats,
                is_featured: productData.is_featured !== undefined ? productData.is_featured : existing.is_featured
            }, connection);

            // 1.1 Sync Home Sections
            if (productData.home_sections !== undefined) {
                await Product.syncHomeSections(productId, productData.home_sections, connection);
            }

            // 2. Sync Variants (if provided)
            const resolvedGstPercent = gstPercent !== undefined ? gstPercent : existing.gstPercent;
            const resolvedIncludesGST = priceIncludesGST !== undefined ? priceIncludesGST : existing.priceIncludesGST;
            if (productData.variants && Array.isArray(productData.variants)) {
                const incomingVariants = productData.variants;
                const existingVariants = await Product.getVariants(productId);
                const existingVariantIds = existingVariants.map(v => v.variant_id);
                const incomingVariantIds = incomingVariants.filter(v => v.variant_id).map(v => v.variant_id);

                // --- A. Delete Variants not in incoming list ---
                const variantsToDelete = existingVariantIds.filter(id => !incomingVariantIds.includes(id));
                for (const vid of variantsToDelete) {
                    await Product.softDeleteVariant(vid, connection);
                }

                // --- B. Update Existing or Add New Variants ---
                for (const vData of incomingVariants) {
                    if (vData.variant_id && existingVariantIds.includes(vData.variant_id)) {
                        // Update existing variant
                        const variantSellingPrice = vData.sellingPrice !== undefined ? vData.sellingPrice : 0;
                        const gstFields = calculateGSTFields(variantSellingPrice, resolvedGstPercent, resolvedIncludesGST);
                        await Product.updateVariant(vData.variant_id, {
                            sku: vData.sku,
                            price: variantSellingPrice,
                            mrp: vData.mrp,
                            sellingPrice: variantSellingPrice,
                            ...gstFields,
                            status: vData.status !== undefined ? vData.status : 1
                        }, connection);

                        // Update inventory threshold if provided
                        if (vData.low_stock_threshold !== undefined) {
                            await inventoryService.updateLowStockThreshold(vData.variant_id, vData.low_stock_threshold, connection);
                        }

                        // Update stock level if provided
                        if (vData.stock !== undefined) {
                            await inventoryService.setStockLevel(vData.variant_id, vData.stock, 'Admin update', null, null, connection);
                        }

                        // Sync Variant Attributes
                        if (vData.attributes) {
                            await Product.deleteVariantAttributes(vData.variant_id, connection);
                            if (vData.attributes.length > 0) {
                                await Product.addVariantAttributes(vData.variant_id, vData.attributes, connection);
                            }
                        }

                        // Sync Variant Media
                        if (vData.images) {
                            await Product.deleteVariantMedia(vData.variant_id, connection);
                            const validImages = vData.images.filter(img => img.url || img.image_url);
                            for (const img of validImages) {
                                const mediaId = await Product.findOrCreateMedia(img, connection);
                                await Product.addVariantMedia(vData.variant_id, mediaId, img.is_primary || 0, img.sort_order || 0, connection);
                            }
                        }
                    } else {
                        // Add new variant
                        const newVid = uuidv4();
                        const gstFields = calculateGSTFields(vData.sellingPrice, resolvedGstPercent, resolvedIncludesGST);
                        await Product.addVariant({
                            variant_id: newVid,
                            product_id: productId,
                            sku: vData.sku,
                            price: vData.sellingPrice,
                            mrp: vData.mrp,
                            sellingPrice: vData.sellingPrice,
                            ...gstFields
                        }, connection);

                        // Initialize Inventory for the new variant
                        await inventoryService.initializeInventory(newVid, vData.initial_stock || 0, vData.low_stock_threshold !== undefined ? vData.low_stock_threshold : 5, connection);

                        if (vData.attributes && vData.attributes.length > 0) {
                            await Product.addVariantAttributes(newVid, vData.attributes, connection);
                        }

                        if (vData.images && vData.images.length > 0) {
                            const validImages = vData.images.filter(img => img.url || img.image_url);
                            for (const img of validImages) {
                                const mediaId = await Product.findOrCreateMedia(img, connection);
                                await Product.addVariantMedia(newVid, mediaId, img.is_primary || 0, img.sort_order || 0, connection);
                            }
                        }
                    }
                }
            }

            // 3. Sync Product-Level Media
            if (productData.images && Array.isArray(productData.images)) {
                await Product.deleteProductMedia(productId, connection);
                const validImages = productData.images.filter(img => img.url || img.image_url);
                for (const img of validImages) {
                    const mediaId = await Product.findOrCreateMedia(img, connection);
                    await Product.addProductMedia(productId, mediaId, img.is_primary || 0, img.sort_order || 0, connection);
                }
            }

            // 4. Sync Attribute-Level Media
            if (productData.attribute_images && Array.isArray(productData.attribute_images)) {
                await Product.deleteAttributeMedia(productId, connection);
                for (const am of productData.attribute_images) {
                    const mediaId = await Product.findOrCreateMedia(am, connection);
                    await Product.addAttributeMedia(productId, am.attribute_id, am.attribute_value_id, mediaId, connection);
                }
            }

            await connection.commit();
            // Return full updated product details
            return await Product.findById(productId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    deleteProduct: async (productId) => {
        const product = await Product.findById(productId);
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await Product.softDelete(productId, connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Variant Operations
    addVariant: async (productId, variantData) => {
        const product = await Product.findById(productId);
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        // Validate SKU
        const existingSku = await Product.findVariantBySku(variantData.sku);
        if (existingSku) {
            const error = new Error(`SKU already exists: ${variantData.sku}`);
            error.statusCode = 400;
            throw error;
        }

        // Validate Attributes
        const allowedMapping = await SubCategory.getAttributesFlat(product.sub_category_id);
        const attrMap = {};
        allowedMapping.forEach(m => {
            if (!attrMap[m.attribute_id]) attrMap[m.attribute_id] = new Set();
            if (m.attribute_value_id) attrMap[m.attribute_id].add(m.attribute_value_id);
        });

        if (variantData.attributes) {
            const usedAttrIds = new Set();
            for (const attr of variantData.attributes) {
                if (usedAttrIds.has(attr.attribute_id)) {
                    const error = new Error(`Duplicate attribute ${attr.attribute_id}`);
                    error.statusCode = 400;
                    throw error;
                }
                usedAttrIds.add(attr.attribute_id);

                if (!attrMap[attr.attribute_id] || !attrMap[attr.attribute_id].has(attr.attribute_value_id)) {
                    const error = new Error(`Invalid attribute or value mapping for this category`);
                    error.statusCode = 400;
                    throw error;
                }
            }
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const variantId = uuidv4();
            const gstFields = calculateGSTFields(variantData.sellingPrice, product.gstPercent, product.priceIncludesGST);
            await Product.addVariant({
                variant_id: variantId,
                product_id: productId,
                sku: variantData.sku,
                price: variantData.sellingPrice,
                mrp: variantData.mrp,
                sellingPrice: variantData.sellingPrice,
                ...gstFields
            }, connection);

            // Initialize Inventory for the new variant
            await inventoryService.initializeInventory(variantId, variantData.initial_stock || 0, variantData.low_stock_threshold || 5, connection);

            if (variantData.attributes) {
                await Product.addVariantAttributes(variantId, variantData.attributes, connection);
            }

            if (variantData.images) {
                const validImages = variantData.images.filter(img => img.image_url);
                if (validImages.length > 0) {
                    await Product.addVariantImages(variantId, validImages, connection);
                }
            }

            await connection.commit();
            return { variant_id: variantId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    updateVariant: async (variantId, variantData) => {
        const existing = await Product.getVariantById(variantId);
        if (!existing) {
            const error = new Error('Variant not found');
            error.statusCode = 404;
            throw error;
        }

        if (variantData.sku && variantData.sku !== existing.sku) {
            const existingSku = await Product.findVariantBySku(variantData.sku);
            if (existingSku) {
                const error = new Error(`SKU already exists: ${variantData.sku}`);
                error.statusCode = 400;
                throw error;
            }
        }

        const product = await Product.findById(existing.product_id);
        const gstFields = calculateGSTFields(
            variantData.sellingPrice !== undefined ? variantData.sellingPrice : existing.sellingPrice,
            product.gstPercent,
            product.priceIncludesGST
        );

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Update Core Fields
            await Product.updateVariant(variantId, {
                sku: variantData.sku || existing.sku,
                price: variantData.sellingPrice !== undefined ? variantData.sellingPrice : existing.price,
                mrp: variantData.mrp !== undefined ? variantData.mrp : existing.mrp,
                sellingPrice: variantData.sellingPrice !== undefined ? variantData.sellingPrice : existing.sellingPrice,
                ...gstFields,
                status: variantData.status !== undefined ? variantData.status : existing.status
            }, connection);

            // 2. Sync Attributes
            if (variantData.attributes) {
                await Product.deleteVariantAttributes(variantId, connection);
                if (variantData.attributes.length > 0) {
                    await Product.addVariantAttributes(variantId, variantData.attributes, connection);
                }
            }

            // 3. Sync Images
            if (variantData.images) {
                await Product.deleteVariantImages(variantId, connection);
                const validImages = variantData.images.filter(img => img.image_url);
                if (validImages.length > 0) {
                    await Product.addVariantImages(variantId, validImages, connection);
                }
            }

            // 4. Sync Inventory/Stock
            if (variantData.initial_stock !== undefined) {
                // Check if inventory record exists
                const existingInventory = await inventoryService.getInventoryByVariant(variantId).catch(() => null);

                if (existingInventory) {
                    // Update existing
                    await inventoryService.setStockLevel(variantId, variantData.initial_stock, 'Updated via variant edit', null, variantData.low_stock_threshold, connection);
                } else {
                    // Initialize if missing (legacy data)
                    await inventoryService.initializeInventory(variantId, variantData.initial_stock, variantData.low_stock_threshold || 5, connection);
                }
            }

            await connection.commit();

            // Return updated variant with attributes/images
            return await Product.getVariantById(variantId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    deleteVariant: async (variantId) => {
        const existing = await Product.getVariantById(variantId);
        if (!existing) {
            const error = new Error('Variant not found');
            error.statusCode = 404;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await Product.softDeleteVariant(variantId, connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    addVariantImage: async (variantId, imageData) => {
        const existing = await Product.getVariantById(variantId);
        if (!existing) {
            const error = new Error('Variant not found');
            error.statusCode = 404;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            if (imageData.is_primary) {
                await Product.clearPrimaryImages(variantId, connection);
            }
            const imageId = await Product.addVariantImage(variantId, imageData, connection);
            await connection.commit();
            return { image_id: imageId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    deleteVariantImage: async (imageId) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await Product.deleteVariantImage(imageId, connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = productService;
