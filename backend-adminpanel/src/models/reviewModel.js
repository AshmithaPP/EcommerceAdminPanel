const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Review = {
    create: async (reviewData) => {
        const { product_id, customer_id, rating, review_text } = reviewData;
        const review_id = uuidv4();
        
        const sql = `
            INSERT INTO product_reviews (review_id, product_id, customer_id, rating, review_text)
            VALUES (?, ?, ?, ?, ?)
        `;
        await db.query(sql, [review_id, product_id, customer_id || null, rating, review_text || null]);
        return review_id;
    },

    findByProductId: async (productId, limit = 10, offset = 0) => {
        const sql = `
            SELECT r.*, u.name as joined_name
            FROM product_reviews r
            LEFT JOIN users u ON r.customer_id = u.user_id
            WHERE r.product_id = ? AND r.status = 1
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await db.query(sql, [productId, parseInt(limit), parseInt(offset)]);
        return rows;
    },


    getProductRatingStats: async (productId) => {
        const sql = `
            SELECT 
                COUNT(*) as count,
                AVG(rating) as average
            FROM product_reviews
            WHERE product_id = ? AND status = 1
        `;
        const [rows] = await db.query(sql, [productId]);
        return {
            count: rows[0].count || 0,
            average: parseFloat(rows[0].average || 0).toFixed(1)
        };
    },

    getRatingBreakdown: async (productId) => {
        const sql = `
            SELECT rating, COUNT(*) as count
            FROM product_reviews
            WHERE product_id = ? AND status = 1
            GROUP BY rating
            ORDER BY rating DESC
        `;
        const [rows] = await db.query(sql, [productId]);
        
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        rows.forEach(row => {
            breakdown[row.rating] = row.count;
        });
        return breakdown;
    }
};

module.exports = Review;
