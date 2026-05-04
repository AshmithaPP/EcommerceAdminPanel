const wishlistService = require('../services/wishlistService');

const wishlistController = {
    getWishlist: async (req, res, next) => {
        try {
            const userId = req.user ? req.user.user_id : null;
            const guestId = req.headers['x-guest-id'];
            
            const items = await wishlistService.getWishlist(userId, guestId);
            res.status(200).json({ success: true, items });
        } catch (error) {
            next(error);
        }
    },

    addToWishlist: async (req, res, next) => {
        try {
            const userId = req.user ? req.user.user_id : null;
            const guestId = req.headers['x-guest-id'];
            
            if (!userId && !guestId) {
                return res.status(400).json({ success: false, message: 'User ID or Guest ID is required' });
            }

            const result = await wishlistService.addToWishlist(userId, guestId, req.body);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    },

    removeFromWishlist: async (req, res, next) => {
        try {
            const userId = req.user ? req.user.user_id : null;
            const guestId = req.headers['x-guest-id'];
            
            const result = await wishlistService.removeFromWishlist(userId, guestId, req.body);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    },

    mergeWishlist: async (req, res, next) => {
        try {
            const userId = req.user.user_id;
            const { guest_id } = req.body;
            if (guest_id) {
                await wishlistService.mergeWishlist(userId, guest_id);
            }
            res.status(200).json({ success: true, message: 'Wishlist merged successfully' });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = wishlistController;
