const cartService = require('../services/cartService');
const db = require('../config/database');

const cartController = {
    getCart: async (req, res, next) => {
        try {
            const userId = req.user ? req.user.user_id : null;
            const guestId = req.headers['x-guest-id'] || req.query.guest_id;
            
            const state = req.query.state || null;
            
            console.log(`🛒 GET CART Request - User: ${userId || 'GUEST'}, Guest: ${guestId || 'NONE'}, State: ${state || 'NONE'}`);
            
            const result = await cartService.getCart(userId, guestId, state);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    },

    addToCart: async (req, res, next) => {
        try {
            const userId = req.user ? req.user.user_id : null;
            const guestId = req.headers['x-guest-id'] || req.body.guest_id;
            
            console.log(`➕ ADD TO CART Request - User: ${userId || 'GUEST'}, Guest: ${guestId || 'NONE'}`);
            
            if (!userId && !guestId) {
                return res.status(400).json({ success: false, message: 'User ID or Guest ID is required' });
            }

            const result = await cartService.addToCart(userId, guestId, req.body);
            
            // Check state immediately after add
            const [countCheck] = await db.query('SELECT COUNT(*) as count FROM carts');
            
            res.status(200).json({ 
                success: true, 
                message: 'Added to cart',
                state: {
                    userId,
                    guestId,
                    totalCarts: countCheck[0].count
                }
            });
        } catch (error) {
            next(error);
        }
    },

    updateQuantity: async (req, res, next) => {
        try {
            const userId = req.user ? req.user.user_id : null;
            const guestId = req.headers['x-guest-id'] || req.body.guest_id;

            const result = await cartService.updateQuantity(userId, guestId, req.body);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    },

    removeItem: async (req, res, next) => {
        try {
            const result = await cartService.removeItem(req.params.cart_item_id);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    },

    clearCart: async (req, res, next) => {
        try {
            const userId = req.user ? req.user.user_id : null;
            const guestId = req.headers['x-guest-id'] || req.query.guest_id;

            const result = await cartService.clearCart(userId, guestId);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    },

    mergeCart: async (req, res, next) => {
        try {
            const userId = req.user.user_id;
            const { guest_id } = req.body;
            if (guest_id) {
                await cartService.mergeCart(userId, guest_id);
            }
            res.status(200).json({ success: true, message: 'Cart merged successfully' });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = cartController;
