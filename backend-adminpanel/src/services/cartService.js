const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const db = require('../config/database');

const cartService = {
    getCart: async (userId, guestId) => {
        let cart = await Cart.findCart(userId, guestId);
        if (!cart) {
            return { cart_id: null, items: [], summary: { subtotal: 0, discount: 0, delivery: 0, total: 0 } };
        }

        const items = await Cart.getCartItems(cart.cart_id);
        const formattedItems = await Promise.all(items.map(async (item) => {
            const attrs = await Cart.getVariantAttributes(item.variant_id);
            const attributes = {};
            attrs.forEach(a => {
                attributes[a.attr_name.toLowerCase()] = a.attr_value;
            });

            return {
                cart_item_id: item.cart_item_id,
                product_id: item.product_id,
                variant_id: item.variant_id,
                name: item.product_name,
                image: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `http://localhost:5000${item.image_url}`) : '',
                attributes,
                price: parseFloat(item.current_price),
                quantity: item.quantity,
                total: parseFloat(item.current_price) * item.quantity,
                stock_status: item.stock_quantity >= item.quantity ? 'in_stock' : 'out_of_stock'
            };
        }));

        const subtotal = formattedItems.reduce((sum, item) => sum + item.total, 0);
        // Add logic for discount/delivery if needed
        const summary = {
            subtotal,
            discount: 0,
            delivery: subtotal > 500 ? 0 : 50,
            total: subtotal + (subtotal > 500 ? 0 : 50)
        };

        return {
            cart_id: cart.cart_id,
            items: formattedItems,
            summary
        };
    },

    addToCart: async (userId, guestId, { product_id, variant_id, quantity }) => {
        // 1. Validate Product/Variant
        const variant = await Product.getVariantById(variant_id);
        if (!variant || variant.product_id !== product_id) {
            const error = new Error('Invalid product or variant');
            error.statusCode = 400;
            throw error;
        }

        // 2. Check Stock
        const stock = await db.query('SELECT quantity FROM inventory_levels WHERE variant_id = ?', [variant_id]);
        const availableStock = stock[0][0]?.quantity || 0;
        if (availableStock < quantity) {
            const error = new Error('Not enough stock available');
            error.statusCode = 400;
            throw error;
        }

        // 3. Find or Create Cart
        let cart = await Cart.findCart(userId, guestId);
        let cartId;
        if (!cart) {
            cartId = await Cart.createCart(userId, guestId);
        } else {
            cartId = cart.cart_id;
        }

        // 4. Check if item exists in cart
        const existingItem = await Cart.getCartItem(cartId, variant_id);
        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (availableStock < newQuantity) {
                const error = new Error('Cannot add more of this item, stock limit reached');
                error.statusCode = 400;
                throw error;
            }
            await Cart.updateItemQuantity(existingItem.cart_item_id, newQuantity);
            return { cart_item_id: existingItem.cart_item_id };
        } else {
            const cartItemId = await Cart.addItem(cartId, product_id, variant_id, quantity, variant.price);
            return { cart_item_id: cartItemId };
        }
    },

    updateQuantity: async (userId, guestId, { cart_item_id, quantity }) => {
        if (quantity <= 0) {
            await Cart.removeItem(cart_item_id);
            return { message: 'Item removed' };
        }

        // Get item to check stock
        const [itemRows] = await db.query('SELECT * FROM cart_items WHERE cart_item_id = ?', [cart_item_id]);
        const item = itemRows[0];
        if (!item) {
            const error = new Error('Cart item not found');
            error.statusCode = 404;
            throw error;
        }

        // Check stock ONLY if increasing quantity
        if (quantity > item.quantity) {
            const stock = await db.query('SELECT quantity FROM inventory_levels WHERE variant_id = ?', [item.variant_id]);
            const availableStock = stock[0][0]?.quantity || 0;
            if (availableStock < quantity) {
                const error = new Error('Not enough stock available');
                error.statusCode = 400;
                throw error;
            }
        }

        await Cart.updateItemQuantity(cart_item_id, quantity);
        return { message: 'Quantity updated' };
    },

    removeItem: async (cart_item_id) => {
        await Cart.removeItem(cart_item_id);
        return { message: 'Item removed' };
    },

    clearCart: async (userId, guestId) => {
        const cart = await Cart.findCart(userId, guestId);
        if (cart) {
            await Cart.clearCart(cart.cart_id);
        }
        return { message: 'Cart cleared' };
    },

    mergeCart: async (userId, guestId) => {
        const guestCart = await Cart.findCart(null, guestId);
        if (!guestCart) return;

        let userCart = await Cart.findCart(userId, null);
        if (!userCart) {
            // Simply transfer the guest cart to the user
            await db.query('UPDATE carts SET user_id = ?, guest_id = NULL WHERE cart_id = ?', [userId, guestCart.cart_id]);
            return;
        }

        // Merge items
        const guestItems = await Cart.getCartItems(guestCart.cart_id);
        for (const gItem of guestItems) {
            const uItem = await Cart.getCartItem(userCart.cart_id, gItem.variant_id);
            if (uItem) {
                // Combine quantity, but check stock
                const stock = await db.query('SELECT quantity FROM inventory_levels WHERE variant_id = ?', [gItem.variant_id]);
                const availableStock = stock[0][0]?.quantity || 0;
                const newQuantity = Math.min(uItem.quantity + gItem.quantity, availableStock);
                await Cart.updateItemQuantity(uItem.cart_item_id, newQuantity);
            } else {
                // Add new item to user cart
                await Cart.addItem(userCart.cart_id, gItem.product_id, gItem.variant_id, gItem.quantity, gItem.price_at_added);
            }
        }

        // Delete guest cart
        await db.query('DELETE FROM carts WHERE cart_id = ?', [guestCart.cart_id]);
    }
};

module.exports = cartService;
