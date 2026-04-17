const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const attributeRoutes = require('./routes/attributeRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const couponRoutes = require('./routes/couponRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const shippingZoneRoutes = require('./routes/shippingZoneRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const path = require('path');
const paymentController = require('./controllers/paymentController');
const { protect, authorize } = require('./middlewares/authMiddleware');

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Serve static files from 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Enable CORS with credentials support
app.use(cors({
    origin: 'http://localhost:5173', // frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/shipping-zones', shippingZoneRoutes);
app.use('/api/upload', uploadRoutes);

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

module.exports = app;
