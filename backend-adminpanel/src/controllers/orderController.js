const Order = require('../models/orderModel');
const cartService = require('../services/cartService');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const db = require('../config/database');

const orderController = {
    createOrder: async (req, res, next) => {
        try {
            const userId = req.user.user_id;
            const guestId = req.headers['x-guest-id'];
            const { address_id, payment_method, address: guestAddress } = req.body;

            console.log('📦 Create Order Request:', {
                userId,
                guestId,
                hasAddress: !!(address_id || guestAddress),
                paymentMethod: payment_method
            });

            // 1. Failsafe: Merge guest items into user account if both exist
            if (userId && guestId) {
                try {
                    console.log(`🔄 Attempting failsafe merge for User: ${userId}, Guest: ${guestId}`);
                    await cartService.mergeCart(userId, guestId);
                } catch (mergeErr) {
                    console.error('❌ Failsafe merge failed:', mergeErr.message);
                    // Continue anyway, maybe user already has items in their account
                }
            }

            // 2. Fetch Cart (Try multiple strategies to find items)
            let cart = await cartService.getCart(userId, guestId);

            // Last resort: If cart is empty but we have a userId, try fetching ONLY by userId
            if ((!cart || !cart.items || cart.items.length === 0) && userId) {
                console.log('🔍 Cart empty with GuestID, retrying with UserID only...');
                cart = await cartService.getCart(userId, null);
            }

            console.log('🛒 Final Cart Check:', {
                cartId: cart?.cart_id,
                itemCount: cart?.items?.length || 0
            });

            if (!cart || !cart.items || cart.items.length === 0) {
                console.warn('🛑 Order creation blocked: No items found in any cart for User:', userId);

                // --- DEEP DEBUG DATA ---
                const [dbCarts] = await db.query('SELECT * FROM carts WHERE user_id = ? OR guest_id = ?', [userId, guestId]);
                const [dbItems] = await db.query(`
                    SELECT ci.* FROM cart_items ci 
                    JOIN carts c ON ci.cart_id = c.cart_id 
                    WHERE c.user_id = ? OR c.guest_id = ?
                `, [userId, guestId]);

                // Sanity check: Are there ANY carts? Does the user exist?
                const [allCarts] = await db.query('SELECT cart_id, user_id, guest_id FROM carts LIMIT 5');
                const [userCheck] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [userId]);

                return res.status(400).json({
                    success: false,
                    message: 'Cart is empty'
                });
            }

            // 2. Validate Stock & Prepare Items
            const items = [];
            let subtotal = 0;

            for (const item of cart.items) {
                // Anti-Reseller Limit check
                if (item.quantity > 10) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Maximum purchase limit is 10 units per item (${item.name || 'Product'})` 
                    });
                }

                let price = 0;
                let variant_name = null;
                let variant_sku = null;
                let product_name = 'Item';
                let image_url = null;
                if (item.variant_id) {
                    const variant = await Product.getVariantById(item.variant_id);
                    if (!variant || variant.stock < item.quantity) {
                        return res.status(400).json({ success: false, message: `Not enough stock for variant` });
                    }
                    price = parseFloat(variant.finalPrice || variant.sellingPrice || variant.price || 0);
                    variant_sku = variant.sku;

                    const product = await Product.findById(item.product_id);
                    product_name = product?.name || 'Product';

                    // Prioritize variant image, fallback to product image
                    image_url = (variant.images && variant.images.length > 0)
                        ? variant.images[0].url
                        : (product?.image_url || null);

                    // Create a readable variant name from attributes
                    if (variant.attributes && variant.attributes.length > 0) {
                        variant_name = variant.attributes.map(a => a.attribute_value).join(' / ');
                    }
                } else {
                    const product = await Product.findById(item.product_id);
                    if (!product || product.stock < item.quantity) {
                        return res.status(400).json({ success: false, message: `Not enough stock for item` });
                    }
                    price = parseFloat(product.price || 0);
                    product_name = product.name;
                    variant_sku = product.base_sku;
                    image_url = product?.image_url || null;
                }

                items.push({
                    product_id: item.product_id,
                    variant_id: item.variant_id || null,
                    product_name,
                    variant_name,
                    variant_sku,
                    quantity: item.quantity,
                    price: price,
                    image_url: image_url
                });
                subtotal += price * item.quantity;
            }

            // 3. Address Logic
            let finalAddress = null;
            if (address_id) {
                finalAddress = await Address.findById(address_id);
            } else if (guestAddress) {
                finalAddress = guestAddress;
            }

            if (!finalAddress) {
                return res.status(400).json({ success: false, message: 'Shipping address is required' });
            }

            // 4. Summary Calculation
            const { coupon_code } = req.body;
            let discount = 0;
            let coupon_id = null;

            if (coupon_code) {
                const couponService = require('../services/couponService');
                try {
                    const validation = await couponService.validateCoupon(coupon_code, userId, subtotal);
                    discount = validation.discount_amount;
                    coupon_id = validation.coupon_id;
                } catch (err) {
                    return res.status(400).json({ success: false, message: err.message });
                }
            }

            const delivery_fee = subtotal > 1000 ? 0 : 50;
            const total_amount = subtotal - discount + delivery_fee;

            // 5. Create Order
            const result = await Order.create({
                user_id: userId,
                address_id: address_id || null,
                subtotal,
                discount,
                delivery_fee,
                total_amount,
                coupon_id,
                payment_method: payment_method || 'razorpay',
                shipping_address: finalAddress
            }, items);

            // 6. Post-Creation Logic
            const orderService = require('../services/orderService');
            if (payment_method !== 'razorpay') {
                console.log('🧹 Clearing cart and deducting stock for direct/COD order...');
                await cartService.clearCart(userId, guestId);
                
                // For COD/Direct, we deduct stock immediately
                await orderService.deductStockForPayment(result.order_id);
            } else {
                console.log('⏳ Skipping stock deduction: Waiting for Razorpay verification...');
            }

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getOrderDetails: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            const order = await Order.findById(order_id);

            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Security check
            if (order.user_id !== req.user.user_id) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            res.status(200).json({
                success: true,
                data: order
            });
        } catch (error) {
            next(error);
        }
    },

    getUserOrders: async (req, res, next) => {
        try {
            const userId = req.user.user_id;
            const { page, limit } = req.query;
            const orders = await Order.findAllByUserId(userId, page, limit);
            res.status(200).json({ success: true, orders });
        } catch (error) {
            next(error);
        }
    },

    cancelOrder: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            const userId = req.user.user_id;

            const success = await Order.cancelOrder(order_id, userId);
            if (!success) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot cancel order. It may have already been shipped or doesn\'t exist.'
                });
            }

            res.status(200).json({ success: true, message: 'Order cancelled successfully' });
        } catch (error) {
            next(error);
        }
    },

    trackOrder: async (req, res, next) => {
        try {
            const { order_id } = req.params;
            const order = await Order.findById(order_id);

            if (!order || order.user_id !== req.user.user_id) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            const timeline = [
                { status: 'Order Placed', date: order.created_at }
            ];

            if (order.payment_status === 'success') {
                timeline.push({ status: 'Payment Verified', date: order.updated_at });
            }

            if (['processing', 'shipped', 'delivered'].includes(order.status)) {
                timeline.push({ status: 'Processing', date: order.updated_at });
            }

            if (['shipped', 'delivered'].includes(order.status)) {
                timeline.push({ status: 'Shipped', date: order.updated_at });
            }

            if (order.status === 'delivered') {
                timeline.push({ status: 'Delivered', date: order.updated_at });
            }

            if (order.status === 'cancelled') {
                timeline.push({ status: 'Cancelled', date: order.cancelled_at });
            }

            res.status(200).json({
                success: true,
                status: order.status,
                tracking: {
                    id: order.tracking_id,
                    courier: order.courier_name,
                    estimated_delivery: order.estimated_delivery_date
                },
                timeline
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = orderController;
