const Order = require('../models/orderModel');
const cartService = require('../services/cartService');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const db = require('../config/database');

const orderController = {
    createOrder: async (req, res, next) => {
        try {
            const userId = req.user ? req.user.user_id : null;
            const guestId = req.headers['x-guest-id'];
            const { address_id, payment_method, address: guestAddress } = req.body;

            // Validation for guest checkouts
            if (!userId) {
                if (!guestAddress) {
                    return res.status(400).json({ success: false, message: 'Shipping address and customer details are required for guest checkout.' });
                }
                if (!guestAddress.full_name || !guestAddress.full_name.trim()) {
                    return res.status(400).json({ success: false, message: 'Full Name is required for guest checkout.' });
                }
                if (!guestAddress.phone || !guestAddress.phone.trim()) {
                    return res.status(400).json({ success: false, message: 'Phone number is required for guest checkout.' });
                }
                if (!guestAddress.address_line1 || !guestAddress.address_line1.trim()) {
                    return res.status(400).json({ success: false, message: 'Address is required for guest checkout.' });
                }
            }

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
                    if (!variant) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `Variant not found or inactive: ${item.variant_id}` 
                        });
                    }
                    const variantStock = variant.stock ?? 0;
                    if (variantStock < item.quantity) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `Not enough stock for variant ${variant.sku}. Available: ${variantStock}, Requested: ${item.quantity}` 
                        });
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
                    if (!product) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `Product not found: ${item.product_id}` 
                        });
                    }
                    const productStock = product.stock ?? 0;
                    if (productStock < item.quantity) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `Not enough stock for item ${product.name}. Available: ${productStock}, Requested: ${item.quantity}` 
                        });
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

            const delivery_fee = cart.summary.shipping_charge || 0;
            const total_amount = subtotal - discount + delivery_fee;

            // 5. GST Calculations (Recalculate based on applied discount)
            const gst_rate = parseFloat(cart.summary.gst_rate || 5);
            const totalBeforeShipping = Math.max(0, subtotal - discount);
            const amount_without_gst = parseFloat((totalBeforeShipping / (1 + (gst_rate / 100))).toFixed(2));
            const gst_amount = parseFloat((totalBeforeShipping - amount_without_gst).toFixed(2));
            
            const SELLER_STATE = "Tamil Nadu";
            const isSameState = finalAddress.state?.toLowerCase().trim().includes(SELLER_STATE.toLowerCase());
            
            let cgst_amount = 0, sgst_amount = 0, igst_amount = 0;
            if (isSameState) {
                cgst_amount = parseFloat((gst_amount / 2).toFixed(2));
                sgst_amount = parseFloat((gst_amount - cgst_amount).toFixed(2));
            } else {
                igst_amount = gst_amount;
            }

            const isCOD = payment_method?.toUpperCase() === 'COD';

            // 6. Create Order
            const result = await Order.create({
                user_id: userId,
                guest_id: guestId || null,
                guest_name: userId ? null : (finalAddress.full_name || null),
                guest_phone: userId ? null : (finalAddress.phone || null),
                guest_email: userId ? null : (finalAddress.email || null),
                address_id: address_id || null,
                subtotal,
                discount,
                delivery_fee,
                total_amount,
                coupon_id,
                payment_method: payment_method || 'razorpay',
                shipping_address: finalAddress,
                gst_rate,
                gst_amount,
                cgst_amount,
                sgst_amount,
                igst_amount,
                amount_without_gst,
                amount_with_gst: totalBeforeShipping,
                shipping_zone: cart.summary.shipping_zone,
                status: isCOD ? 'pending' : 'pending', // Both start as pending, but COD is ready for stock deduction
                payment_status: isCOD ? 'Pending' : 'Pending'
            }, items);

            // 6. Finalize Coupon Usage if applicable
            if (coupon_id && discount > 0) {
                const couponService = require('../services/couponService');
                await couponService.finalizeCouponUsage(coupon_id, userId, result.order_id, discount);
            }

            // 7. Post-Creation Logic
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
            if (order.user_id) {
                if (!req.user || order.user_id !== req.user.user_id) {
                    return res.status(403).json({ success: false, message: 'Unauthorized' });
                }
            } else {
                const guestId = req.headers['x-guest-id'];
                if (order.guest_id && guestId && order.guest_id !== guestId) {
                    return res.status(403).json({ success: false, message: 'Unauthorized' });
                }
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
                    tracking_url: order.tracking_url || 'https://www.stcourier.com/track/shipment',
                    shipment_status: order.shipment_status || 'Pending',
                    shipped_at: order.shipped_at || null,
                    estimated_delivery: order.estimated_delivery_date
                },
                timeline
            });
        } catch (error) {
            next(error);
        }
    },

    trackGuestOrder: async (req, res, next) => {
        try {
            const { orderId, phone } = req.query;
            if (!orderId || !phone) {
                return res.status(400).json({ success: false, message: 'Order ID and Phone Number are required' });
            }

            const cleanOrderId = orderId.trim().replace(/^#/, '');

            const [orders] = await db.query(
                `SELECT * FROM orders WHERE (order_id = ? OR order_number = ?)`, 
                [cleanOrderId, cleanOrderId]
            );

            if (orders.length === 0) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            const orderObj = orders[0];

            let shippingAddress = {};
            try {
                shippingAddress = typeof orderObj.shipping_address === 'string' 
                    ? JSON.parse(orderObj.shipping_address) 
                    : orderObj.shipping_address;
            } catch (e) {}

            const dbPhone = orderObj.guest_phone || shippingAddress.phone || '';
            
            const normInputPhone = phone.trim().replace(/\D/g, '').slice(-10);
            const normDbPhone = dbPhone.trim().replace(/\D/g, '').slice(-10);

            if (normInputPhone !== normDbPhone) {
                return res.status(403).json({ success: false, message: 'Unauthorized. Phone number does not match this order.' });
            }

            const order = await Order.findById(orderObj.order_id);

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
                order_id: order.order_id,
                order_number: order.order_number,
                status: order.status,
                payment_status: order.payment_status,
                delivery_status: order.shipment_status || 'Pending',
                items: order.items,
                timeline,
                shipping_address: order.shipping_address,
                tracking: {
                    courier: order.courier_name,
                    id: order.tracking_id,
                    tracking_url: order.tracking_url
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = orderController;
