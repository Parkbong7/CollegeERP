const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const jobRosterController = require('../controllers/jobRosterController');
const timetableScheduleController = require('../controllers/timetableScheduleController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { resolveTenant } = require('../middlewares/tenantContext');

router.use(authenticateToken);
router.use(resolveTenant);

// Timetable & Schedule Workflows (HOD Create Schedule)
router.get('/schedule/meta', timetableScheduleController.getScheduleMeta);
router.get('/schedule', timetableScheduleController.getClassSchedule);
router.post('/schedule/publish', timetableScheduleController.publishClassSchedule);
router.delete('/schedule', timetableScheduleController.deleteClassSchedule);

// Job Roster Workflows (HOD Task Allocation for Department Staff)
router.get('/job-roster', jobRosterController.getJobRoster);
router.post('/job-roster/assign', jobRosterController.assignTask);
router.post('/job-roster/bulk-assign', jobRosterController.bulkAssignTasks);
router.patch('/job-roster/:id/status', jobRosterController.updateTaskStatus);
router.delete('/job-roster/:id', jobRosterController.deleteTask);

// Workflow 7.1
router.get('/student-subject-lookup', departmentController.studentSubjectLookup);

// Workflow 7.2
router.get('/hod/me/staff', departmentController.getHODStaffOverview);
router.get('/hod/list', departmentController.getHODList);

// Overview
router.get('/:id/overview', departmentController.getDepartmentOverview);

module.exports = router;
