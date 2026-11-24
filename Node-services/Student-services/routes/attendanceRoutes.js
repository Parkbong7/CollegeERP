const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, requireRoles } = require('../middlewares/authMiddleware');
const { resolveTenant } = require('../middlewares/tenantContext');

router.use(authenticateToken);
router.use(resolveTenant);

// 1. Mark Attendance: Staff and Super Admin (HOD and Student are view only!)
router.post('/mark', requireRoles('Super Admin', 'Staff', 'Admin'), attendanceController.markAttendance);

// 2. Class sheet: Super Admin, HOD, Staff
router.get('/sheet', requireRoles('Super Admin', 'HOD', 'Staff', 'Admin'), attendanceController.getAttendanceSheet);

// 3. My Personal Attendance: Student, Staff, Super Admin, HOD
router.get('/my-attendance', requireRoles('Student', 'Super Admin', 'HOD', 'Staff', 'Admin'), attendanceController.getMyAttendance);

// 4. Specific student attendance profile
router.get('/student/:studentId', requireRoles('Super Admin', 'HOD', 'Staff', 'Admin', 'Student'), attendanceController.getStudentAttendance);

// 5. Overall summary analytics
router.get('/summary', requireRoles('Super Admin', 'HOD', 'Staff', 'Admin'), attendanceController.getAttendanceSummary);

module.exports = router;
