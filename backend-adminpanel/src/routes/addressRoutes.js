const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { protect } = require('../middlewares/authMiddleware');

// All address routes are protected
router.use(protect);

router.post('/', addressController.addAddress);
router.get('/', addressController.getAddresses);
router.put('/:address_id', addressController.updateAddress);
router.delete('/:address_id', addressController.deleteAddress);

module.exports = router;
