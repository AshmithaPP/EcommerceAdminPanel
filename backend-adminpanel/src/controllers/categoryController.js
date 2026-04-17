const categoryService = require('../services/categoryService');
const { 
    categorySchema, 
    subCategorySchema,
    assignAttributesSchema, 
    uuidSchema 
} = require('../validators/categoryValidator');

const categoryController = {
    // Parent Category Handlers
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
                data: category,
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
                    items: categories,
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
                    items: tree
                },
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    // Sub Category Handlers
    createSubCategory: async (req, res, next) => {
        try {
            const { error } = subCategorySchema.validate(req.body);
            if (error) {
                const err = new Error(error.details[0].message);
                err.statusCode = 400;
                throw err;
            }

            const subCategory = await categoryService.createSubCategory(req.body, req.user.user_id);

            res.status(201).json({
                success: true,
                message: 'Sub-category created successfully',
                data: subCategory,
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    getSubCategoriesByCategoryId: async (req, res, next) => {
        try {
            const { category_id } = req.params;
            const subCategories = await categoryService.getSubCategoriesByCategoryId(category_id);

            res.status(200).json({
                success: true,
                message: 'Sub-categories fetched successfully',
                data: {
                    items: subCategories
                },
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    updateSubCategory: async (req, res, next) => {
        try {
            const { sub_category_id } = req.params;
            const { error } = subCategorySchema.validate(req.body);
            if (error) {
                const err = new Error(error.details[0].message);
                err.statusCode = 400;
                throw err;
            }

            const subCategory = await categoryService.updateSubCategory(sub_category_id, req.body, req.user.user_id);

            res.status(200).json({
                success: true,
                message: 'Sub-category updated successfully',
                data: subCategory,
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    deleteSubCategory: async (req, res, next) => {
        try {
            const { sub_category_id } = req.params;
            await categoryService.deleteSubCategory(sub_category_id, req.user.user_id);

            res.status(200).json({
                success: true,
                message: 'Sub-category deleted successfully',
                data: null,
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    assignSubCategoryAttributes: async (req, res, next) => {
        try {
            const { sub_category_id } = req.params;
            const { error } = assignAttributesSchema.validate(req.body);
            if (error) {
                const err = new Error(error.details[0].message);
                err.statusCode = 400;
                throw err;
            }

            const result = await categoryService.assignSubCategoryAttributes(sub_category_id, req.body.attribute_ids, req.user.user_id);

            res.status(200).json({
                success: true,
                message: 'Sub-category attribute assignment completed',
                data: result,
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    unassignSubCategoryAttribute: async (req, res, next) => {
        try {
            const { sub_category_id, attribute_id } = req.params;
            await categoryService.unassignSubCategoryAttribute(sub_category_id, attribute_id);

            res.status(200).json({
                success: true,
                message: 'Attribute removed from sub-category',
                data: null,
                error: null
            });
        } catch (error) {
            next(error);
        }
    },

    getSubCategoryAttributes: async (req, res, next) => {
        try {
            const { sub_category_id } = req.params;
            const attributes = await categoryService.getSubCategoryAttributes(sub_category_id);

            res.status(200).json({
                success: true,
                message: 'Sub-category attributes fetched successfully',
                data: {
                    items: attributes
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
                data: category,
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
                data: category,
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
                data: result,
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
                    items: attributes
                },
                error: null
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = categoryController;
