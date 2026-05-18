const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// Apply protection to all product routes
router.use(protect);
router.get('/', checkPermission('customers', 'view'), customerController.listCustomers);
router.get('/:user_id', checkPermission('customers', 'view'), customerController.getCustomerDetails);
router.post('/', checkPermission('customers', 'edit'), customerController.createCustomer);
router.put('/:user_id', checkPermission('customers', 'edit'), customerController.updateCustomer);

// Address Management
router.post('/:user_id/addresses', checkPermission('customers', 'edit'), customerController.addAddress);
router.put('/addresses/:addressId', checkPermission('customers', 'edit'), customerController.updateAddress);
router.delete('/addresses/:addressId', checkPermission('customers', 'edit'), customerController.deleteAddress);

module.exports = router;
