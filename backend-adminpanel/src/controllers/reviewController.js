const reviewService = require('../services/reviewService');

const reviewController = {
    addReview: async (req, res, next) => {
        try {
            const { product_id } = req.params;
            const { rating, comment, userId } = req.body;

            const reviewId = await reviewService.addReview({
                product_id,
                customer_id: userId || req.user?.user_id,
                rating,
                comment
            });

            res.status(201).json({
                success: true,
                message: 'Review added successfully',
                data: { review_id: reviewId }
            });
        } catch (error) {
            next(error);
        }
    },

    getReviewSummary: async (req, res, next) => {
        try {
            const { product_id } = req.params;
            const summary = await reviewService.getReviewSummary(product_id);

            res.status(200).json({
                success: true,
                data: summary
            });
        } catch (error) {
            next(error);
        }
    },

    getReviewList: async (req, res, next) => {
        try {
            const { product_id } = req.params;
            const { page, limit, sort } = req.query;

            const result = await reviewService.getReviewList(product_id, page, limit, sort);

            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = reviewController;

