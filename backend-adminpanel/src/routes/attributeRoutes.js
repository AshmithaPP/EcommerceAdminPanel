const express = require('express');
const router = express.Router();
const attributeController = require('../controllers/attributeController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

router.post('/attribute-create', attributeController.createAttribute);
router.get('/attribute-list', attributeController.getAttributes);
router.put('/attribute-update/:attribute_id', attributeController.updateAttribute);
router.delete('/attribute-delete/:attribute_id', attributeController.deleteAttribute);

router.post('/attribute-values-add/:attribute_id', attributeController.addAttributeValues);
router.get('/attribute-values-get/:attribute_id', attributeController.getAttributeValues);

// Update/Delete specific value
router.put('/attribute-value-update/:attribute_value_id', attributeController.updateAttributeValue);
router.delete('/attribute-value-delete/:attribute_value_id', attributeController.deleteAttributeValue);

module.exports = router;
