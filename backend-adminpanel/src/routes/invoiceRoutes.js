const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All invoice endpoints require authentication
router.use(protect);

// Fetch invoice details (metadata + path) by Order ID
router.get('/order/:order_id', invoiceController.getInvoiceDetails);

// Download Invoice PDF file by Order ID
router.get('/order/:order_id/download', invoiceController.downloadInvoicePDF);

// Resend Invoice email by Order ID (Admin/Superadmin only)
router.post('/order/:order_id/resend', authorize('admin', 'superadmin'), invoiceController.resendInvoiceEmail);

module.exports = router;
