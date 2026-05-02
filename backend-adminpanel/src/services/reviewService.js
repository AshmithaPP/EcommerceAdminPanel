const Review = require('../models/reviewModel');
const db = require('../config/database');

const reviewService = {
    addReview: async (reviewData) => {
        const { product_id, customer_id, rating, comment } = reviewData;

        if (!product_id || !rating) {
            const error = new Error('Product ID and rating are required');
            error.statusCode = 400;
            throw error;
        }

        if (rating < 1 || rating > 5) {
            const error = new Error('Rating must be between 1 and 5');
            error.statusCode = 400;
            throw error;
        }

        const reviewId = await Review.create({
            product_id,
            customer_id,
            rating,
            review_text: comment
        });

        return reviewId;
    },

    getReviewSummary: async (productId) => {
        const stats = await Review.getProductRatingStats(productId);
        const breakdown = await Review.getRatingBreakdown(productId);

        return {
            averageRating: parseFloat(stats.average),
            totalReviews: stats.count,
            ratingBreakdown: breakdown
        };
    },

    getReviewList: async (productId, page = 1, limit = 10, sort = 'latest') => {
        const offset = (page - 1) * limit;

        // Note: For now, sort is just Latest. 
        // In the future, we can add more sort logic to Review.findByProductId
        const reviews = await Review.findByProductId(productId, limit, offset);
        
        // Count total for pagination
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM product_reviews WHERE product_id = ? AND status = 1', [productId]);

        return {
            reviews: reviews.map(r => ({
                id: r.review_id,
                userName: r.joined_name || r.customer_name || 'Guest User',
                rating: r.rating,
                comment: r.review_text || '',
                date: r.created_at
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }
        };
    }
};

module.exports = reviewService;
