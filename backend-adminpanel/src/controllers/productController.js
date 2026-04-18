const productService = require('../services/productService');
const imageService = require('../services/imageService');

/**
 * Helper to inject an uploaded file path into the product data structure
 * based on the fieldname (e.g., "product_img_0" or "variant_0_img_2").
 */
const injectFileUrl = (data, fieldname, urls) => {
    // urls is an object from imageService containing URLs and metadata
    const image_url = urls.main_url;
    const thumbnail_url = urls.thumb_url || null;
    const mini_thumbnail_url = urls.mini_url || null;
    
    // Metadata
    const width = urls.width || null;
    const height = urls.height || null;
    const file_size = urls.file_size || null;
    const format = urls.format || null;

    if (fieldname === 'product_video') {
        data.video_url = typeof urls === 'string' ? urls : urls.main_url;
        return;
    }

    if (fieldname.startsWith('product_img_')) {
        const parts = fieldname.split('_');
        const index = parseInt(parts[parts.length - 1]);
        if (!data.images) data.images = [];
        if (!data.images[index]) data.images[index] = {};
        data.images[index].image_url = image_url;
        data.images[index].thumbnail_url = thumbnail_url;
        data.images[index].mini_thumbnail_url = mini_thumbnail_url;
        data.images[index].width = width;
        data.images[index].height = height;
        data.images[index].file_size = file_size;
        data.images[index].format = format;
    } else if (fieldname.startsWith('variant_')) {
        const parts = fieldname.split('_');
        const vIndex = parseInt(parts[1]);
        const imgIndex = parseInt(parts[3]);
        if (!data.variants) data.variants = [];
        if (!data.variants[vIndex]) data.variants[vIndex] = { images: [] };
        if (!data.variants[vIndex].images) data.variants[vIndex].images = [];
        if (!data.variants[vIndex].images[imgIndex]) data.variants[vIndex].images[imgIndex] = {};
        data.variants[vIndex].images[imgIndex].image_url = image_url;
        data.variants[vIndex].images[imgIndex].thumbnail_url = thumbnail_url;
        data.variants[vIndex].images[imgIndex].mini_thumbnail_url = mini_thumbnail_url;
        data.variants[vIndex].images[imgIndex].width = width;
        data.variants[vIndex].images[imgIndex].height = height;
        data.variants[vIndex].images[imgIndex].file_size = file_size;
        data.variants[vIndex].images[imgIndex].format = format;
    }
};

const productController = {
    createProduct: async (req, res, next) => {
        try {
            let productData = req.body;
            
            // If multipart/form-data, productData might be stringified JSON
            if (req.body.productData && typeof req.body.productData === 'string') {
                productData = JSON.parse(req.body.productData);
            }

            // Associate uploaded files
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    
                    if (file.mimetype.startsWith('image/')) {
                        // Strict validation for size (500KB)
                        if (file.size > 500 * 1024) {
                            throw new Error(`File ${file.originalname} exceeds 500KB limit`);
                        }

                        // Process images into multiple sizes and get metadata
                        const processedData = await imageService.processProductImage(file);
                        injectFileUrl(productData, fieldname, processedData);
                    } else if (file.mimetype.startsWith('video/')) {
                        // Video files go direct
                        injectFileUrl(productData, fieldname, `/uploads/${file.filename}`);
                    }
                }
            }

            // MAPPING FIX: Assign top-level product images to the first variant
            // so they are processed by productService.createProduct.
            if (productData.images && productData.images.length > 0 && productData.variants && productData.variants.length > 0) {
                if (!productData.variants[0].images) productData.variants[0].images = [];
                // Add top-level images to the beginning of the first variant's images
                productData.variants[0].images = [
                    ...productData.images.filter(img => img.image_url),
                    ...productData.variants[0].images
                ];
            }

            const result = await productService.createProduct(productData);
            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getProducts: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await productService.getProducts(page, limit);
            res.status(200).json({
                success: true,
                data: result.products,
                total: result.total,
                page,
                limit
            });
        } catch (error) {
            next(error);
        }
    },

    getProductById: async (req, res, next) => {
        try {
            const result = await productService.getProductById(req.params.product_id);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    updateProduct: async (req, res, next) => {
        try {
            let productData = req.body;

            // If multipart/form-data, productData might be stringified JSON
            if (req.body.productData && typeof req.body.productData === 'string') {
                productData = JSON.parse(req.body.productData);
            }

            // Associate uploaded files
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    
                    if (file.mimetype.startsWith('image/')) {
                        // Strict validation for size (500KB)
                        if (file.size > 500 * 1024) {
                            throw new Error(`File ${file.originalname} exceeds 500KB limit`);
                        }

                        // Process images into multiple sizes and get metadata
                        const processedData = await imageService.processProductImage(file);
                        injectFileUrl(productData, fieldname, processedData);
                    } else if (file.mimetype.startsWith('video/')) {
                        // Video files go direct
                        injectFileUrl(productData, fieldname, `/uploads/${file.filename}`);
                    }
                }
            }

            // MAPPING FIX: Assign top-level product images to the first variant
            if (productData.images && productData.images.length > 0 && productData.variants && productData.variants.length > 0) {
                if (!productData.variants[0].images) productData.variants[0].images = [];
                // Add top-level images to the beginning of the first variant's images
                // Only merge those that have a URL (newly uploaded or existing)
                const topImages = productData.images.filter(img => img.image_url);
                productData.variants[0].images = [
                    ...topImages,
                    ...productData.variants[0].images
                ];
            }

            const result = await productService.updateProduct(req.params.product_id, productData);
            res.status(200).json({
                success: true,
                message: 'Product updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    deleteProduct: async (req, res, next) => {
        try {
            await productService.deleteProduct(req.params.product_id);
            res.status(200).json({
                success: true,
                message: 'Product soft-deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    // Variant Handlers
    addVariant: async (req, res, next) => {
        try {
            const result = await productService.addVariant(req.params.product_id, req.body);
            res.status(201).json({
                success: true,
                message: 'Variant added successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    updateVariant: async (req, res, next) => {
        try {
            const result = await productService.updateVariant(req.params.variant_id, req.body);
            res.status(200).json({
                success: true,
                message: 'Variant updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    deleteVariant: async (req, res, next) => {
        try {
            await productService.deleteVariant(req.params.variant_id);
            res.status(200).json({
                success: true,
                message: 'Variant deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    addVariantImage: async (req, res, next) => {
        try {
            const result = await productService.addVariantImage(req.params.variant_id, req.body);
            res.status(201).json({
                success: true,
                message: 'Variant image added successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    deleteVariantImage: async (req, res, next) => {
        try {
            await productService.deleteVariantImage(req.params.image_id);
            res.status(200).json({
                success: true,
                message: 'Variant image deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = productController;
