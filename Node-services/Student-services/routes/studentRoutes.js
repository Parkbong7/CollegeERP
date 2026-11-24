const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken, requireRoles } = require('../middlewares/authMiddleware');
const { resolveTenant } = require('../middlewares/tenantContext');

router.use(authenticateToken);
router.use(resolveTenant);

router.get('/search', studentController.searchStudents);
router.get('/:id', studentController.getStudentById);
router.get('/:id/subjects', studentController.getStudentSubjects);
router.post('/', requireRoles('Super Admin'), studentController.createStudent);
router.put('/:id', requireRoles('Admin', 'HOD'), studentController.updateStudent);
router.delete('/:id', requireRoles('Admin'), studentController.deleteStudent);

module.exports = router;
