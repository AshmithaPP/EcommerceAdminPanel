const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { optionalProtect, protect } = require('../middlewares/authMiddleware');

router.get('/', optionalProtect, wishlistController.getWishlist);
router.post('/add', optionalProtect, wishlistController.addToWishlist);
router.delete('/remove', optionalProtect, wishlistController.removeFromWishlist);
router.post('/merge', protect, wishlistController.mergeWishlist);

module.exports = router;
