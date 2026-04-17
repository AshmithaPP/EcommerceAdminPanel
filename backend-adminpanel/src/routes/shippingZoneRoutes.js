const express = require('express');
const router = express.Router();
const shippingZoneController = require('../controllers/shippingZoneController');
const { protect } = require('../middlewares/authMiddleware');

// Public/Internal check (Calculate is used by checkout)
router.post('/calculate', shippingZoneController.calculate);

// Protected Management routes (Admin only)
router.use(protect);

router.get('/', shippingZoneController.getAll);
router.get('/:id', shippingZoneController.getById);
router.post('/', shippingZoneController.create);
router.put('/:id', shippingZoneController.update);
router.delete('/:id', shippingZoneController.delete);

module.exports = router;
