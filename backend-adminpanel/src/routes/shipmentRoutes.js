const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const { protect } = require('../middlewares/authMiddleware');

// All shipment routes are protected (Admin only)
router.use(protect);

router.post('/', shipmentController.create);
router.get('/', shipmentController.getAll);
router.get('/:id', shipmentController.getShipment);
router.patch('/:id/status', shipmentController.updateStatus);
router.post('/:id/rto', shipmentController.getRTO);

module.exports = router;
