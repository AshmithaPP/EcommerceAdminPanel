const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All staff / admin users management endpoints require being authenticated AND a Super Admin!
router.use(protect);
router.use(authorize('superadmin'));

router.get('/', adminUserController.listAdmins);
router.post('/', adminUserController.createAdmin);
router.put('/:id', adminUserController.updateAdmin);
router.put('/:id/status', adminUserController.toggleAdminStatus);
router.delete('/:id', adminUserController.deleteAdmin);

module.exports = router;
