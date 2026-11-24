const express = require('express');
const router = express.Router();
const deptController = require('../controllers/departmentController');

router.get('/', deptController.getDepartmentDetails);

module.exports = router;
