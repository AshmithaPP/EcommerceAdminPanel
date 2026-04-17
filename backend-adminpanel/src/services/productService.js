const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Attribute = require('../models/attributeModel');
const inventoryService = require('./inventoryService');
const db = require('../config/database');
const slugify = require('../utils/slugify');
const { v4: uuidv4 } = require('uuid');

const productService = {
    createProduct: async (productData) => {
        const { name, category_id, brand, base_price, variants } = productData;

        // 1. Validation: Category
        const category = await Category.findById(category_id);
        if (!category) {
            const error = new Error('Invalid category ID');
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

        // Get allowed attributes for category
        const allowedMapping = await Category.getAttributesFlat(category_id);
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

            // Check SKU uniqueness in DB
            const existingSku = await Product.findVariantBySku(variant.sku);
            if (existingSku) {
                const error = new Error(`SKU already exists: ${variant.sku}`);
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
                category_id,
                brand,
                base_price: base_price || 0
            }, connection);

            // 2. Insert Variants
            for (const variantData of variants) {
                const variantId = uuidv4();
                await Product.addVariant({
                    variant_id: variantId,
                    product_id: productId,
                    sku: variantData.sku,
                    price: variantData.price
                }, connection);

                // Initialize Inventory for the new variant
                await inventoryService.initializeInventory(variantId, variantData.initial_stock || 0, 10, connection);

                // Insert Variant Attributes
                if (variantData.attributes && variantData.attributes.length > 0) {
                    await Product.addVariantAttributes(variantId, variantData.attributes, connection);
                }

                // Insert Variant Images
                if (variantData.images && variantData.images.length > 0) {
                    // Robustly filter out any images missing a URL
                    const validImages = variantData.images.filter(img => img.image_url);
                    if (validImages.length > 0) {
                        await Product.addVariantImages(variantId, validImages, connection);
                    }
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
        return product;
    },

    updateProduct: async (productId, productData) => {
        const existing = await Product.findById(productId);
        if (!existing) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        const { name, category_id, brand, base_price, status } = productData;

        // Validation: Category
        const targetCategoryId = category_id || existing.category_id;
        if (category_id && category_id !== existing.category_id) {
            const category = await Category.findById(category_id);
            if (!category) {
                const error = new Error('Invalid category ID');
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
                category_id: targetCategoryId,
                brand: brand || existing.brand,
                base_price: base_price !== undefined ? base_price : existing.base_price,
                status: status !== undefined ? status : existing.status
            }, connection);

            // 2. Sync Variants (if provided)
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
                        await Product.updateVariant(vData.variant_id, {
                            sku: vData.sku,
                            price: vData.price,
                            status: vData.status !== undefined ? vData.status : 1
                        }, connection);

                        // Sync Variant Attributes
                        if (vData.attributes) {
                            await Product.deleteVariantAttributes(vData.variant_id, connection);
                            if (vData.attributes.length > 0) {
                                await Product.addVariantAttributes(vData.variant_id, vData.attributes, connection);
                            }
                        }

                        // Sync Variant Images
                        if (vData.images) {
                            await Product.deleteVariantImages(vData.variant_id, connection);
                            const validImages = vData.images.filter(img => img.image_url);
                            if (validImages.length > 0) {
                                await Product.addVariantImages(vData.variant_id, validImages, connection);
                            }
                        }
                    } else {
                        // Add new variant
                        const newVid = uuidv4();
                        await Product.addVariant({
                            variant_id: newVid,
                            product_id: productId,
                            sku: vData.sku,
                            price: vData.price
                        }, connection);

                        // Initialize Inventory for the new variant
                        await inventoryService.initializeInventory(newVid, vData.initial_stock || 0, 10, connection);

                        if (vData.attributes && vData.attributes.length > 0) {
                            await Product.addVariantAttributes(newVid, vData.attributes, connection);
                        }

                        if (vData.images && vData.images.length > 0) {
                            for (const img of vData.images) {
                                if (!img.image_url) {
                                    const error = new Error('Image URL is missing in new variant');
                                    error.statusCode = 400;
                                    throw error;
                                }
                            }
                            await Product.addVariantImages(newVid, vData.images, connection);
                        }
                    }
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
        const allowedMapping = await Category.getAttributesFlat(product.category_id);
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
            await Product.addVariant({
                variant_id: variantId,
                product_id: productId,
                sku: variantData.sku,
                price: variantData.price
            }, connection);

            // Initialize Inventory for the new variant
            await inventoryService.initializeInventory(variantId, variantData.initial_stock || 0, 10, connection);

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

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Update Core Fields
            await Product.updateVariant(variantId, {
                sku: variantData.sku || existing.sku,
                price: variantData.price !== undefined ? variantData.price : existing.price,
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
                    await inventoryService.setStockLevel(variantId, variantData.initial_stock, 'Updated via variant edit', null, connection);
                } else {
                    // Initialize if missing (legacy data)
                    await inventoryService.initializeInventory(variantId, variantData.initial_stock, 10, connection);
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
