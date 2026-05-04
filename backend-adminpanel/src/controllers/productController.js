const productService = require('../services/productService');
const imageService = require('../services/imageService');

/**
 * Helper to inject an uploaded file path into the product data structure
 * based on the fieldname (e.g., "product_img_0" or "variant_0_img_2").
 */
const injectFileUrl = (data, fieldname, urls) => {
    // If urls is a string (e.g. for video), we use it as is
    if (typeof urls === 'string') {
        if (fieldname === 'product_video') {
            data.video_url = urls;
        }
        return;
    }

    // urls is an object from imageService containing URLs and metadata
    const main_url = urls.main_url || urls.image_url || null;
    const thumbnail_url = urls.thumb_url || urls.thumbnail_url || null;
    const mini_thumbnail_url = urls.mini_url || urls.mini_thumbnail_url || null;
    const { width = null, height = null, file_size = null, format = null, hash = null } = urls;

    if (fieldname.startsWith('product_img_')) {
        const parts = fieldname.split('_');
        const index = parseInt(parts[parts.length - 1]);
        if (!data.images) data.images = [];
        if (!data.images[index]) data.images[index] = {};
        
        data.images[index] = {
            ...data.images[index],
            image_url: main_url,
            thumbnail_url,
            mini_thumbnail_url,
            width,
            height,
            file_size,
            format,
            hash
        };
    } else if (fieldname.startsWith('variant_')) {
        const parts = fieldname.split('_');
        const vIndex = parseInt(parts[1]);
        const imgIndex = parseInt(parts[3]);
        
        if (!data.variants) data.variants = [];
        if (!data.variants[vIndex]) data.variants[vIndex] = { images: [] };
        if (!data.variants[vIndex].images) data.variants[vIndex].images = [];
        if (!data.variants[vIndex].images[imgIndex]) data.variants[vIndex].images[imgIndex] = {};
        
        data.variants[vIndex].images[imgIndex] = {
            ...data.variants[vIndex].images[imgIndex],
            image_url: main_url,
            thumbnail_url,
            mini_thumbnail_url,
            width,
            height,
            file_size,
            format,
            hash
        };
    }
};

const productController = {
    createProduct: async (req, res, next) => {
        try {
            let productData = req.body;
            
            // Handle multipart/form-data where productData might be in 'productData' or 'req' field
            const rawData = req.body.productData || req.body.req;
            if (rawData && typeof rawData === 'string') {
                try {
                    productData = JSON.parse(rawData);
                } catch (e) {
                    const error = new Error('Invalid JSON format in product data');
                    error.statusCode = 400;
                    throw error;
                }
            }

            // Associate uploaded files
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    
                    if (file.mimetype.startsWith('image/')) {
                        // Relaxed validation: 2MB limit for images
                        if (file.size > 2 * 1024 * 1024) {
                            const error = new Error(`File ${file.originalname} exceeds 2MB limit`);
                            error.statusCode = 400;
                            throw error;
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

            // Cleaned: Removed manual mapping hacks. Fallback/Mappings now handled in ProductService.

            const result = await productService.createProduct(productData);
            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: result
            });
        } catch (error) {
            console.error('Create Product Error:', error);
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

    getProductsFrontend: async (req, res, next) => {
        try {
            const query = {
                category: req.query.category,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 12,
                min_price: req.query.min_price,
                max_price: req.query.max_price,
                rating: req.query.rating,
                sort: req.query.sort || 'newest',
                search: req.query.search,
                // Dynamic attributes
                color: req.query.color,
                pattern: req.query.pattern,
                occasion: req.query.occasion,
                fabric: req.query.fabric
            };

            const result = await productService.getProductsFrontend(query);
            
            res.status(200).json({
                success: true,
                products: result.products,
                pagination: result.pagination,
                filters: result.filters
            });
        } catch (error) {
            next(error);
        }
    },

    getProductBySlug: async (req, res, next) => {
        try {
            const result = await productService.getProductBySlug(req.params.slug);
            res.status(200).json({
                success: true,
                data: result
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

            // Handle multipart/form-data where productData might be in 'productData' or 'req' field
            const rawData = req.body.productData || req.body.req;
            if (rawData && typeof rawData === 'string') {
                try {
                    productData = JSON.parse(rawData);
                } catch (e) {
                    const error = new Error('Invalid JSON format in product data');
                    error.statusCode = 400;
                    throw error;
                }
            }

            // Associate uploaded files
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    
                    if (file.mimetype.startsWith('image/')) {
                        // Relaxed validation: 2MB limit for images
                        if (file.size > 2 * 1024 * 1024) {
                            const error = new Error(`File ${file.originalname} exceeds 2MB limit`);
                            error.statusCode = 400;
                            throw error;
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

            // Cleaned: Removed manual mapping hacks.

            const result = await productService.updateProduct(req.params.product_id, productData);
            res.status(200).json({
                success: true,
                message: 'Product updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Update Product Error:', error);
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
