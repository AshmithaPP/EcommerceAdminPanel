const categoryService = require('../services/categoryService');
const { 
    categorySchema, 
    assignAttributesSchema, 
    uuidSchema 
} = require('../validators/categoryValidator');

const categoryController = {
    createCategory: async (req, res, next) => {
        try {
            const { error } = categorySchema.validate(req.body);
            if (error) {
                const err = new Error(error.details[0].message);
                err.statusCode = 400;
                throw err;
            }

            const category = await categoryService.createCategory(req.body, req.user.user_id);

            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: category, // Direct object
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    getCategories: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const { categories, total } = await categoryService.getCategories(page, limit);

            res.status(200).json({
                success: true,
                message: 'Categories fetched successfully',
                data: {
                    items: categories, // Normalized list
                    pagination: {
                        total,
                        page,
                        limit,
                        pages: Math.ceil(total / limit)
                    }
                },
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    getCategoryTree: async (req, res, next) => {
        try {
            const tree = await categoryService.getCategoryTree();

            res.status(200).json({
                success: true,
                message: 'Category tree fetched successfully',
                data: {
                    items: tree // Trees are lists of root nodes
                },
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    getCategoryById: async (req, res, next) => {
        try {
            const { category_id } = req.params;
            const { error: idError } = uuidSchema.validate(category_id);
            if (idError) throw new Error('Invalid category ID format');

            const category = await categoryService.getCategoryById(category_id);

            res.status(200).json({
                success: true,
                message: 'Category fetched successfully',
                data: category, // Direct object
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    updateCategory: async (req, res, next) => {
        try {
            const { category_id } = req.params;
            const { error: idError } = uuidSchema.validate(category_id);
            if (idError) throw new Error('Invalid category ID format');

            const { error } = categorySchema.validate(req.body);
            if (error) {
                const err = new Error(error.details[0].message);
                err.statusCode = 400;
                throw err;
            }

            const category = await categoryService.updateCategory(category_id, req.body, req.user.user_id);

            res.status(200).json({
                success: true,
                message: 'Category updated successfully',
                data: category, // Direct object
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    deleteCategory: async (req, res, next) => {
        try {
            const { category_id } = req.params;
            const { error: idError } = uuidSchema.validate(category_id);
            if (idError) throw new Error('Invalid category ID format');

            await categoryService.deleteCategory(category_id, req.user.user_id);

            res.status(200).json({
                success: true,
                message: 'Category deleted successfully',
                data: null,
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    assignAttributes: async (req, res, next) => {
        try {
            const { category_id } = req.params;
            const { error: idError } = uuidSchema.validate(category_id);
            if (idError) throw new Error('Invalid category ID format');

            const { error } = assignAttributesSchema.validate(req.body);
            if (error) {
                const err = new Error(error.details[0].message);
                err.statusCode = 400;
                throw err;
            }

            const result = await categoryService.assignAttributes(category_id, req.body.attribute_ids, req.user.user_id);

            res.status(200).json({
                success: true,
                message: 'Attribute assignment completed',
                data: result, // { assigned, skipped }
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    unassignAttribute: async (req, res, next) => {
        try {
            const { category_id, attribute_id } = req.params;
            const { error: catIdError } = uuidSchema.validate(category_id);
            const { error: attrIdError } = uuidSchema.validate(attribute_id);
            if (catIdError || attrIdError) throw new Error('Invalid ID format');

            await categoryService.unassignAttribute(category_id, attribute_id);

            res.status(200).json({
                success: true,
                message: 'Attribute removed from category',
                data: null,
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    getCategoryAttributes: async (req, res, next) => {
        try {
            const { category_id } = req.params;
            const { error: idError } = uuidSchema.validate(category_id);
            if (idError) throw new Error('Invalid category ID format');

            const attributes = await categoryService.getCategoryAttributes(category_id);

            res.status(200).json({
                success: true,
                message: 'Category attributes fetched successfully',
                data: {
                    items: attributes // Nested list
                },
                error: null
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = categoryController;
