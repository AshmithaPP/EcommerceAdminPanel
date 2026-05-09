const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const attributeRoutes = require('./routes/attributeRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const couponRoutes = require('./routes/couponRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const blogRoutes = require('./routes/blogRoutes');
const path = require('path');
const paymentController = require('./controllers/paymentController');
const { protect, authorize } = require('./middlewares/authMiddleware');
const homeRoutes = require('./routes/homeRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const addressRoutes = require('./routes/addressRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminOrderRoutes = require('./routes/adminOrderRoutes');
const db = require('./config/database');

// --- Auto Migration: Ensure Address Table Exists ---
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS addresses (
                address_id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                phone VARCHAR(15) NOT NULL,
                email VARCHAR(100),
                address_line1 TEXT NOT NULL,
                address_line2 TEXT,
                landmark VARCHAR(100),
                city VARCHAR(50) NOT NULL,
                state VARCHAR(50) NOT NULL,
                postal_code VARCHAR(10) NOT NULL,
                country VARCHAR(50) NOT NULL DEFAULT 'India',
                address_type ENUM('home', 'work', 'other') DEFAULT 'home',
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Address table check complete');

        // --- Migration: Ensure Orders Table is Complete ---
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                order_id VARCHAR(36) PRIMARY KEY,
                order_number VARCHAR(20) UNIQUE NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                address_id VARCHAR(36),
                subtotal DECIMAL(10,2) NOT NULL,
                discount DECIMAL(10,2) DEFAULT 0,
                delivery_fee DECIMAL(10,2) DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                payment_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
                payment_method VARCHAR(20) DEFAULT 'razorpay',
                shipping_address JSON,
                tracking_id VARCHAR(100),
                courier_name VARCHAR(100),
                estimated_delivery_date DATE,
                cancelled_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            ) ENGINE=InnoDB;
        `);

        // Check for missing columns in case table already existed
        const columnsToAdd = [
            { name: 'address_id', type: 'VARCHAR(36) AFTER user_id' },
            { name: 'subtotal', type: 'DECIMAL(10,2) NOT NULL AFTER address_id' },
            { name: 'discount', type: 'DECIMAL(10,2) DEFAULT 0 AFTER subtotal' },
            { name: 'delivery_fee', type: 'DECIMAL(10,2) DEFAULT 0 AFTER discount' },
            { name: 'shipping_address', type: 'JSON AFTER payment_method' },
            { name: 'coupon_id', type: 'VARCHAR(36) AFTER total_amount' },
            { name: 'tracking_id', type: 'VARCHAR(100) AFTER shipping_address' },
            { name: 'courier_name', type: 'VARCHAR(100) AFTER tracking_id' },
            { name: 'estimated_delivery_date', type: 'DATE AFTER courier_name' }
        ];

        for (const col of columnsToAdd) {
            try {
                await db.query(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added column ${col.name} to orders`);
            } catch (e) {
                // Column likely exists
            }
        }

        console.log('✅ Orders table schema check complete');

        // --- Migration: Ensure Order Items Table is Complete ---
        await db.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                order_item_id VARCHAR(36) PRIMARY KEY,
                order_id VARCHAR(36) NOT NULL,
                product_id VARCHAR(36) NOT NULL,
                variant_id VARCHAR(36),
                product_name VARCHAR(255) NOT NULL,
                variant_name VARCHAR(100),
                variant_sku VARCHAR(50),
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        // Check for missing columns in order_items
        const itemColsToAdd = [
            { name: 'product_name', type: 'VARCHAR(255) NOT NULL AFTER variant_id' },
            { name: 'variant_name', type: 'VARCHAR(100) AFTER product_name' },
            { name: 'variant_sku', type: 'VARCHAR(50) AFTER variant_name' }
        ];

        for (const col of itemColsToAdd) {
            try {
                await db.query(`ALTER TABLE order_items ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added column ${col.name} to order_items`);
            } catch (e) {
                // Column likely exists
            }
        }

        // Add image_url to order_items
        try {
            await db.query(`ALTER TABLE order_items ADD COLUMN image_url TEXT AFTER price`);
            console.log(`✅ Added column image_url to order_items`);
        } catch (e) { }

        console.log('✅ Order items schema check complete');

        // --- Migration: Ensure Payments Table exists ---
        await db.query(`
            CREATE TABLE IF NOT EXISTS payments (
                payment_id VARCHAR(36) PRIMARY KEY,
                order_id VARCHAR(36) NOT NULL,
                gateway ENUM('razorpay') DEFAULT 'razorpay',
                gateway_order_id VARCHAR(255),
                gateway_payment_id VARCHAR(255),
                amount DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Payments table check complete');

        // Check for missing columns in payments table
        const paymentColsToAdd = [
            { name: 'gateway', type: "ENUM('razorpay') DEFAULT 'razorpay' AFTER order_id" },
            { name: 'gateway_order_id', type: 'VARCHAR(255) AFTER gateway' },
            { name: 'gateway_payment_id', type: 'VARCHAR(255) AFTER gateway_order_id' }
        ];

        for (const col of paymentColsToAdd) {
            try {
                await db.query(`ALTER TABLE payments ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added column ${col.name} to payments`);
            } catch (e) {
                // Column likely exists
            }
        }

        // Fix legacy columns causing errors
        const legacyCols = ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'];
        for (const col of legacyCols) {
            try {
                await db.query(`ALTER TABLE payments MODIFY COLUMN ${col} VARCHAR(255) NULL`);
            } catch (e) { }
        }
        // --- Migration: Ensure Order Timeline Table exists ---
        await db.query(`
            CREATE TABLE IF NOT EXISTS order_timeline (
                timeline_id VARCHAR(36) PRIMARY KEY,
                order_id VARCHAR(36) NOT NULL,
                status VARCHAR(50) NOT NULL,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Order timeline table check complete');

        // --- Migration: Database Optimization Indexes ---
        try {
            await db.query('CREATE INDEX idx_orders_created_at ON orders(created_at)');
            await db.query('CREATE INDEX idx_orders_payment_status ON orders(payment_status)');
            await db.query('CREATE INDEX idx_order_items_product_id ON order_items(product_id)');
            console.log('✅ Performance indexes created');
        } catch (e) { }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
})();
const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Serve static files from 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Enable CORS with credentials support
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-id']
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/orders', adminOrderRoutes);

// Admin Payments List
app.get('/api/admin/payments', protect, authorize('admin', 'superadmin'), paymentController.getAllPayments);

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Backend is running' });
});

// Root route
app.get('/', (req, res) => {
    res.send('Admin Panel Backend API');
});

// Centralized Error Handler
app.use(errorHandler);

app.set('version', 'v1.0.DEBUG_LOGGING_ACTIVE');

module.exports = app;
