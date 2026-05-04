const cartService = require('../services/cartService');

const cartController = {
    getCart: async (req, res, next) => {
        try {
            const userId = req.user ? req.user.user_id : null;
            const guestId = req.headers['x-guest-id'] || req.query.guest_id;
            
            const result = await cartService.getCart(userId, guestId);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    },

    addToCart: async (req, res, next) => {
        try {
            const userId = req.user ? req.user.user_id : null;
            const guestId = req.headers['x-guest-id'] || req.body.guest_id;
            
            if (!userId && !guestId) {
                return res.status(400).json({ success: false, message: 'User ID or Guest ID is required' });
            }

            const result = await cartService.addToCart(userId, guestId, req.body);
            res.status(200).json({ success: true, data: result });
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
