const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const ShippingZone = require('../models/shippingModel');
const db = require('../config/database');

const cartService = {
    getCart: async (userId, guestId, state = null) => {
        // 1. Force identify state
        let detectedState = state;
        
        if (!detectedState && userId) {
            // Check default address first
            const [defaultAddr] = await db.query('SELECT state FROM addresses WHERE user_id = ? AND is_default = 1 LIMIT 1', [userId]);
            if (defaultAddr.length > 0) {
                detectedState = defaultAddr[0].state;
            } else {
                // Check any address if no default exists
                const [anyAddr] = await db.query('SELECT state FROM addresses WHERE user_id = ? LIMIT 1', [userId]);
                if (anyAddr.length > 0) {
                    detectedState = anyAddr[0].state;
                }
            }
        }

        // 2. Normalize and compare
        const SELLER_STATE = "Tamil Nadu";
        const isSameState = detectedState && detectedState.toLowerCase().trim().includes("tamil nadu");

        // 3. Fetch Global GST Setting
        const [settingsRows] = await db.query('SELECT value FROM settings WHERE settings_key = "store_settings"');
        const storeSettings = settingsRows[0]?.value || { gst: 5 };
        const GST_RATE = parseFloat(storeSettings.gst || 5);

        let cart = await Cart.findCart(userId, guestId);
        if (!cart) {
            return { 
                cart_id: null, items: [], 
                summary: { subtotal: 0, discount: 0, shipping_charge: 0, taxable_amount: 0, gst_amount: 0, total: 0, gst_rate: GST_RATE } 
            };
        }

        const items = await Cart.getCartItems(cart.cart_id);

        const formattedItems = await Promise.all(items.map(async (item) => {
            const attrs = await Cart.getVariantAttributes(item.variant_id);
            const attributes = {};
            attrs.forEach(a => { attributes[a.attr_name.toLowerCase()] = a.attr_value; });

            const unitPrice = parseFloat(item.current_price);
            const quantity = item.quantity;
            const lineTotal = unitPrice * quantity;

            const taxableAmount = parseFloat((lineTotal / (1 + (GST_RATE / 100))).toFixed(2));
            const gstAmount = parseFloat((lineTotal - taxableAmount).toFixed(2));
            
            let cgst = 0, sgst = 0, igst = 0;
            if (detectedState) {
                if (isSameState) {
                    cgst = parseFloat((gstAmount / 2).toFixed(2));
                    sgst = parseFloat((gstAmount - cgst).toFixed(2));
                } else {
                    igst = gstAmount;
                }
            }

            return {
                cart_item_id: item.cart_item_id,
                product_id: item.product_id,
                variant_id: item.variant_id,
                name: item.product_name,
                image: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `http://localhost:5000${item.image_url}`) : '',
                attributes,
                unit_price: unitPrice,
                quantity: quantity,
                line_total: lineTotal,
                taxable_amount: taxableAmount,
                gst_rate: GST_RATE,
                gst_amount: gstAmount,
                cgst_amount: cgst,
                sgst_amount: sgst,
                igst_amount: igst,
                stock_quantity: item.stock_quantity,
                stock_status: item.stock_quantity >= item.quantity ? 'in_stock' : 'out_of_stock'
            };
        }));

        const subtotal = formattedItems.reduce((sum, item) => sum + item.line_total, 0);
        
        // Shipping Calculation
        let shippingCharge = 0;
        let shippingZoneName = 'Standard Delivery';
        let estimatedDays = '3-5 Days';
        let freeThreshold = 500;
        if (detectedState) {
            const shipResult = await ShippingZone.calculateCharge(detectedState, subtotal);
            shippingCharge = shipResult.shippingCharge;
            shippingZoneName = shipResult.zone;
            estimatedDays = shipResult.estimated_days || '3-5 Days';
            freeThreshold = shipResult.free_threshold || 500;
        }

        const discount = 0;
        const totalBeforeShipping = Math.max(0, subtotal - discount);
        const taxableAmountSummary = parseFloat((totalBeforeShipping / (1 + (GST_RATE / 100))).toFixed(2));
        const gstAmountSummary = parseFloat((totalBeforeShipping - taxableAmountSummary).toFixed(2));
        
        let cgstSummary = 0, sgstSummary = 0, igstSummary = 0;
        if (detectedState) {
            if (isSameState) {
                cgstSummary = parseFloat((gstAmountSummary / 2).toFixed(2));
                sgstSummary = parseFloat((gstAmountSummary - cgstSummary).toFixed(2));
            } else {
                igstSummary = gstAmountSummary;
            }
        }

        return {
            cart_id: cart.cart_id,
            items: formattedItems,
            summary: {
                subtotal,
                discount,
                shipping_charge: shippingCharge,
                shipping_zone: shippingZoneName,
                taxable_amount: taxableAmountSummary,
                gst_rate: GST_RATE,
                gst_amount: gstAmountSummary,
                cgst_amount: cgstSummary,
                sgst_amount: sgstSummary,
                igst_amount: igstSummary,
                total: totalBeforeShipping + shippingCharge,
                currency: "INR",
                is_gst_inclusive: true,
                detected_state: detectedState,
                estimated_days: estimatedDays,
                free_shipping_threshold: freeThreshold
            }
        };
    },

    addToCart: async (userId, guestId, { product_id, variant_id, quantity }) => {
        if (!variant_id && product_id) {
            const variants = await Product.getVariants(product_id);
            if (variants && variants.length > 0) variant_id = variants[0].variant_id;
        }
        const variant = await Product.getVariantById(variant_id);
        if (!variant) throw new Error('Invalid variant');
        
        let cart = await Cart.findCart(userId, guestId);
        let cartId = cart ? cart.cart_id : await Cart.createCart(userId, guestId);
        
        const MAX_LIMIT = 10;
        const existingItem = await Cart.getCartItem(cartId, variant_id);
        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > MAX_LIMIT) {
                const error = new Error(`Maximum purchase limit is ${MAX_LIMIT} units per item`);
                error.statusCode = 400;
                throw error;
            }
            await Cart.updateItemQuantity(existingItem.cart_item_id, newQuantity);
            return { cart_item_id: existingItem.cart_item_id };
        } else {
            if (quantity > MAX_LIMIT) {
                const error = new Error(`Maximum purchase limit is ${MAX_LIMIT} units per item`);
                error.statusCode = 400;
                throw error;
            }
            const cartItemId = await Cart.addItem(cartId, product_id, variant_id, quantity, variant.price);
            return { cart_item_id: cartItemId };
        }
    },

    updateQuantity: async (userId, guestId, { cart_item_id, quantity }) => {
        const MAX_LIMIT = 10;
        if (quantity > MAX_LIMIT) {
            const error = new Error(`Maximum purchase limit is ${MAX_LIMIT} units per item`);
            error.statusCode = 400;
            throw error;
        }
        if (quantity <= 0) {
            await Cart.removeItem(cart_item_id);
            return { message: 'Item removed' };
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
        if (cart) await Cart.clearCart(cart.cart_id);
        return { message: 'Cart cleared' };
    },

    mergeCart: async (userId, guestId) => {
        const guestCart = await Cart.findCart(null, guestId);
        if (!guestCart) return;
        let userCart = await Cart.findCart(userId, null);
        if (!userCart) {
            await db.query('UPDATE carts SET user_id = ?, guest_id = NULL WHERE cart_id = ?', [userId, guestCart.cart_id]);
            return;
        }
        const guestItems = await Cart.getCartItems(guestCart.cart_id);
        for (const gItem of guestItems) {
            const uItem = await Cart.getCartItem(userCart.cart_id, gItem.variant_id);
            if (uItem) {
                await Cart.updateItemQuantity(uItem.cart_item_id, uItem.quantity + gItem.quantity);
            } else {
                await Cart.addItem(userCart.cart_id, gItem.product_id, gItem.variant_id, gItem.quantity, gItem.price_at_added);
            }
        }
        await db.query('DELETE FROM carts WHERE cart_id = ?', [guestCart.cart_id]);
    }
};

module.exports = cartService;
