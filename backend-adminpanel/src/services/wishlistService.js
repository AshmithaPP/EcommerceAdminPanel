const Wishlist = require('../models/wishlistModel');

const wishlistService = {
    getWishlist: async (userId, guestId) => {
        const items = await Wishlist.getWishlist(userId, guestId);
        
        return items.map(item => ({
            wishlist_id: item.wishlist_id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            name: item.product_name,
            image: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `http://localhost:5000${item.image_url}`) : '',
            price: parseFloat(item.price || 0),
            mrp: parseFloat(item.mrp || 0),
            stock_status: item.stock_quantity > 0 ? 'in_stock' : 'out_of_stock'
        }));
    },

    addToWishlist: async (userId, guestId, { product_id, variant_id }) => {
        const success = await Wishlist.addItem(userId, guestId, product_id, variant_id);
        return { success, message: success ? 'Added to wishlist' : 'Already in wishlist' };
    },

    removeFromWishlist: async (userId, guestId, { product_id, variant_id }) => {
        await Wishlist.removeItem(userId, guestId, product_id, variant_id);
        return { message: 'Removed from wishlist' };
    },

    mergeWishlist: async (userId, guestId) => {
        await Wishlist.mergeWishlist(userId, guestId);
        return { message: 'Wishlist merged' };
    }
};

module.exports = wishlistService;
