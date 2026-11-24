const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { authenticateToken, requireRoles } = require('../middlewares/authMiddleware');
const { resolveTenant } = require('../middlewares/tenantContext');

router.use(authenticateToken);
router.use(resolveTenant);

// Year Master
router.get('/years', masterController.getAllYears);
router.get('/years/:id', masterController.getYearById);
router.get('/years/:id/subjects', masterController.getYearSubjects);
router.post('/years', requireRoles('Admin'), masterController.createYear);
router.put('/years/:id', requireRoles('Admin'), masterController.updateYear);
router.delete('/years/:id', requireRoles('Admin'), masterController.deleteYear);

// Subject CRUD
router.get('/subjects', masterController.getAllSubjects);
router.post('/subjects', requireRoles('Admin', 'HOD'), masterController.createSubject);
router.put('/subjects/:id', requireRoles('Admin', 'HOD'), masterController.updateSubject);
router.delete('/subjects/:id', requireRoles('Admin', 'HOD'), masterController.deleteSubject);

// Staff Master
router.get('/staff/search', masterController.searchStaff);
router.get('/staff/:id', masterController.getStaffById);
router.get('/staff/:id/assignments', masterController.getStaffAssignments);
router.post('/staff', requireRoles('Super Admin', 'Admin'), masterController.createStaff);

// Staff-Subject Allocation (Super Admin only - Sub Admin cannot edit/allocate)
router.post('/staff/assignments', requireRoles('Super Admin', 'Admin'), masterController.createStaffAssignment);
router.put('/staff/assignments/:assignmentId', requireRoles('Super Admin', 'Admin'), masterController.updateStaffAssignment);
router.delete('/staff/assignments/:assignmentId', requireRoles('Super Admin', 'Admin'), masterController.deleteStaffAssignment);

// Department Master
router.get('/departments/search', masterController.searchDepartments);
router.get('/departments/:id', masterController.getDepartmentById);
router.get('/departments/:id/staff', masterController.getDepartmentStaff);
router.get('/departments/:id/student-counts', masterController.getDepartmentStudentCounts);
router.post('/departments', masterController.createDepartment);
router.post('/departments/:id/assign-hod', masterController.assignHOD);

// Timetable / Class Schedule for Year Master
router.get('/schedule', masterController.getClassSchedule);

module.exports = router;
