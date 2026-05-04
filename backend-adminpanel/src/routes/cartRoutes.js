const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { optionalProtect, protect } = require('../middlewares/authMiddleware');

// Guest support via optionalProtect (injects req.user if token exists)
router.get('/', optionalProtect, cartController.getCart);
router.post('/add', optionalProtect, cartController.addToCart);
router.put('/update', optionalProtect, cartController.updateQuantity);
router.delete('/item/:cart_item_id', optionalProtect, cartController.removeItem);
router.delete('/clear', optionalProtect, cartController.clearCart);

// Explicit merge (called after login)
router.post('/merge', protect, cartController.mergeCart);

module.exports = router;
