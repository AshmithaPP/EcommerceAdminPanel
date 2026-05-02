const express = require('express');
const reviewController = require('../controllers/reviewController');
const { optionalProtect } = require('../middlewares/authMiddleware');
const router = express.Router({ mergeParams: true });

// Public routes
router.get('/summary', reviewController.getReviewSummary);
router.get('/', reviewController.getReviewList);

// Flexible route (Logged-in users are identified, Guests can also review)
router.post('/', optionalProtect, reviewController.addReview);

module.exports = router;