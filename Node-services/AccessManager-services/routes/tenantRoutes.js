const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { resolveTenant } = require('../middlewares/tenantContext');

router.use(authenticateToken);
router.use(resolveTenant);

router.get('/current', authController.getCurrentTenant);
router.get('/summary', authController.getTenantSummary);

module.exports = router;
