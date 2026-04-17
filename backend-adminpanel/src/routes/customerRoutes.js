const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect } = require('../middlewares/authMiddleware');

// Apply protection to all product routes
router.use(protect);
router.get('/', customerController.listCustomers);
router.get('/:user_id', customerController.getCustomerDetails);
router.post('/', customerController.createCustomer);
router.put('/:user_id', customerController.updateCustomer);

// Address Management
router.post('/:user_id/addresses', customerController.addAddress);
router.put('/addresses/:addressId', customerController.updateAddress);
router.delete('/addresses/:addressId', customerController.deleteAddress);

module.exports = router;
