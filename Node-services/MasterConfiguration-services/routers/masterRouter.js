const express = require('express');
const router = express.Router();
const deptController = require('../controllers/departmentMasterController');
const yearController = require('../controllers/academicYearController');
const staffController = require('../controllers/staffMasterController');

router.get('/departments', deptController.getDepartmentMasters);
router.get('/years', yearController.getAcademicYears);
router.get('/staff', staffController.getStaffMasters);

module.exports = router;
