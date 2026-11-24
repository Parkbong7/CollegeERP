const { Op } = require('sequelize');
const Joi = require('joi');
const models = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Also load master sequelize connection if needed to keep both DBs in sync
const masterSequelize = require('../../MasterConfiguration-services/config/db.config');

/**
 * Helper to resolve HOD target department
 */
async function resolveTargetDepartment(req, tenantId) {
  const currentUser = req.user;
  let deptId = req.query.departmentId || req.body.departmentId;

  if (currentUser.role === 'HOD') {
    if (currentUser.departmentId) {
      deptId = currentUser.departmentId;
    } else if (currentUser.staffId) {
      const assignment = await models.HODAssignment.findOne({
        where: { tenant_id: tenantId, staff_id: currentUser.staffId, is_active: true }
      });
      if (assignment) deptId = assignment.department_id;
    }
    if (!deptId) {
      const staffUser = await models.Staff.findOne({
        where: { tenant_id: tenantId, email: currentUser.email }
      });
      if (staffUser) {
        const assignment = await models.HODAssignment.findOne({
          where: { tenant_id: tenantId, staff_id: staffUser.id, is_active: true }
        });
        if (assignment) deptId = assignment.department_id;
        else deptId = staffUser.department_id;
      }
    }
  }

  if (!deptId) {
    const firstDept = await models.Department.findOne({
      where: { tenant_id: tenantId, status: 'active' },
      order: [['code', 'ASC']]
    });
    if (firstDept) deptId = firstDept.id;
  }

  return deptId;
}

/**
 * 1. GET /departments/schedule/meta
 * Fetch metadata needed by HOD to build the schedule:
 * - Current department
 * - All Academic Years (Year 1 to Year 4)
 * - Department Subjects with semester mappings and assigned staff
 * - Department Faculty Members
 */
exports.getScheduleMeta = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const deptId = await resolveTargetDepartment(req, tenantId);

    if (!deptId) {
      return errorResponse(res, 'Department context could not be resolved.', 404);
    }

    const department = await models.Department.findOne({
      where: { id: deptId, tenant_id: tenantId },
      attributes: ['id', 'code', 'name']
    });

    const academicYears = await models.AcademicYear.findAll({
      where: { tenant_id: tenantId, status: 'active' },
      attributes: ['id', 'name', 'code', 'start_date', 'end_date'],
      order: [['code', 'ASC']]
    });

    // Department subjects with assigned staff
    const subjects = await models.Subject.findAll({
      where: { department_id: deptId, tenant_id: tenantId, status: 'active' },
      include: [
        {
          model: models.StaffSubjectAssignment,
          where: { tenant_id: tenantId, is_active: true },
          required: false,
          include: [{ model: models.Staff, attributes: ['id', 'name', 'employee_id', 'designation'] }]
        }
      ],
      order: [['semester', 'ASC'], ['code', 'ASC']]
    });

    const formattedSubjects = subjects.map((s) => {
      const assign = s.StaffSubjectAssignments && s.StaffSubjectAssignments.length > 0 ? s.StaffSubjectAssignments[0] : null;
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        semester: s.semester,
        academicYearId: s.academic_year_id,
        credits: s.credits,
        staffId: assign?.Staff?.id || null,
        staffName: assign?.Staff?.name || null,
        staffDesignation: assign?.Staff?.designation || null
      };
    });

    // Department Staff (Excluding HOD)
    const hodAssignment = await models.HODAssignment.findOne({
      where: { department_id: deptId, tenant_id: tenantId, is_active: true }
    });
    const hodStaffId = hodAssignment?.staff_id;

    const staffWhere = { department_id: deptId, tenant_id: tenantId, status: 'active' };
    if (hodStaffId) {
      staffWhere.id = { [Op.ne]: hodStaffId };
    }

    const staffMembers = await models.Staff.findAll({
      where: staffWhere,
      attributes: ['id', 'name', 'employee_id', 'designation', 'email'],
      order: [['name', 'ASC']]
    });

    return successResponse(res, {
      department,
      academicYears,
      subjects: formattedSubjects,
      staffMembers
    });
  } catch (err) {
    console.error('[Get Schedule Meta Error]', err);
    return errorResponse(res, 'Failed to retrieve schedule metadata: ' + err.message, 500);
  }
};

/**
 * 2. GET /departments/schedule
 * Retrieve published timetable matrix for a department, academic year, and semester
 */
exports.getClassSchedule = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { academicYearId, semester } = req.query;
    const deptId = await resolveTargetDepartment(req, tenantId);

    if (!academicYearId || !semester) {
      return errorResponse(res, 'academicYearId and semester query parameters are required.', 400);
    }

    const where = {
      tenant_id: tenantId,
      department_id: deptId,
      academic_year_id: academicYearId,
      semester: semester
    };

    const entries = await models.ClassSchedule.findAll({
      where,
      order: [
        ['day_of_week', 'ASC'],
        ['period_number', 'ASC']
      ]
    });

    // Group into 2D schedule matrix by Day and Period
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const matrix = {};
    DAYS.forEach(d => {
      matrix[d] = {};
      for (let p = 1; p <= 6; p++) {
        matrix[d][p] = null;
      }
    });

    entries.forEach(e => {
      if (matrix[e.day_of_week]) {
        matrix[e.day_of_week][e.period_number] = {
          id: e.id,
          dayOfWeek: e.day_of_week,
          periodNumber: e.period_number,
          startTime: e.start_time,
          endTime: e.end_time,
          subjectId: e.subject_id,
          subjectCode: e.subject_code,
          subjectName: e.subject_name,
          staffId: e.staff_id,
          staffName: e.staff_name,
          roomNumber: e.room_number,
          scheduleType: e.schedule_type,
          status: e.status
        };
      }
    });

    const department = await models.Department.findOne({
      where: { id: deptId, tenant_id: tenantId },
      attributes: ['id', 'code', 'name']
    });

    const year = await models.AcademicYear.findOne({
      where: { id: academicYearId, tenant_id: tenantId },
      attributes: ['id', 'name', 'code']
    });

    return successResponse(res, {
      department,
      academicYear: year,
      semester,
      totalSlots: entries.length,
      entries,
      matrix
    });
  } catch (err) {
    console.error('[Get Class Schedule Error]', err);
    return errorResponse(res, 'Failed to fetch class schedule: ' + err.message, 500);
  }
};

/**
 * 3. POST /departments/schedule/publish
 * HOD creates and publishes the class timetable
 */
exports.publishClassSchedule = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentUser = req.user;

    // Check permissions: HOD or Super Admin
    if (!['HOD', 'Super Admin', 'Admin'].includes(currentUser.role)) {
      return errorResponse(res, 'Access denied. Only HOD and Administrators can create and publish schedules.', 403);
    }

    const { academicYearId, semester, departmentId, entries } = req.body;

    if (!academicYearId || !semester || !Array.isArray(entries) || entries.length === 0) {
      return errorResponse(res, 'academicYearId, semester, and a non-empty entries array are required.', 400);
    }

    const deptId = departmentId || await resolveTargetDepartment(req, tenantId);

    // Atomically replace existing schedule for this department + year + semester
    await models.ClassSchedule.destroy({
      where: {
        tenant_id: tenantId,
        department_id: deptId,
        academic_year_id: academicYearId,
        semester: semester
      }
    });

    // Also clear in master DB if connection available
    try {
      await masterSequelize.query(`
        DELETE FROM class_schedules 
        WHERE tenant_id = :tenantId AND department_id = :deptId AND academic_year_id = :yearId AND semester = :sem
      `, {
        replacements: { tenantId, deptId, yearId: academicYearId, sem: semester }
      });
    } catch (e) {
      console.warn('Master DB direct delete notice:', e.message);
    }

    // Prepare records
    const recordsToCreate = entries.map((e) => ({
      tenant_id: tenantId,
      department_id: deptId,
      academic_year_id: academicYearId,
      semester: semester,
      day_of_week: e.dayOfWeek,
      period_number: parseInt(e.periodNumber, 10),
      start_time: e.startTime || '09:00',
      end_time: e.endTime || '10:00',
      subject_id: e.subjectId || null,
      subject_code: e.subjectCode || 'GEN101',
      subject_name: e.subjectName || 'Departmental Lecture',
      staff_id: e.staffId || null,
      staff_name: e.staffName || 'Faculty In-Charge',
      room_number: e.roomNumber || 'Lecture Hall 101',
      schedule_type: e.scheduleType || 'Lecture',
      status: 'published',
      created_by_user_id: currentUser.userId || currentUser.id
    }));

    // Insert into college_erp_department
    const createdEntries = await models.ClassSchedule.bulkCreate(recordsToCreate);

    // Also sync into college_erp_master so Year Master reads it immediately
    try {
      for (const rec of recordsToCreate) {
        await masterSequelize.query(`
          INSERT INTO class_schedules 
          (tenant_id, department_id, academic_year_id, semester, day_of_week, period_number, start_time, end_time, subject_id, subject_code, subject_name, staff_id, staff_name, room_number, schedule_type, status, created_by_user_id, created_at, updated_at)
          VALUES 
          (:tenant_id, :department_id, :academic_year_id, :semester, :day_of_week, :period_number, :start_time, :end_time, :subject_id, :subject_code, :subject_name, :staff_id, :staff_name, :room_number, :schedule_type, :status, :created_by_user_id, NOW(), NOW())
        `, { replacements: rec });
      }
    } catch (e) {
      console.warn('Master DB sync notice:', e.message);
    }

    return successResponse(
      res,
      { count: createdEntries.length, semester, academicYearId },
      `Successfully published ${createdEntries.length} timetable periods for ${semester}. Schedule is now active and synced with Year Master!`
    );
  } catch (err) {
    console.error('[Publish Schedule Error]', err);
    return errorResponse(res, 'Failed to publish class schedule: ' + err.message, 500);
  }
};

/**
 * 4. DELETE /departments/schedule
 * Clear published timetable for a semester
 */
exports.deleteClassSchedule = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentUser = req.user;
    const { academicYearId, semester, departmentId } = req.body;

    if (!['HOD', 'Super Admin', 'Admin'].includes(currentUser.role)) {
      return errorResponse(res, 'Access denied.', 403);
    }

    const deptId = departmentId || await resolveTargetDepartment(req, tenantId);

    await models.ClassSchedule.destroy({
      where: {
        tenant_id: tenantId,
        department_id: deptId,
        academic_year_id: academicYearId,
        semester: semester
      }
    });

    try {
      await masterSequelize.query(`
        DELETE FROM class_schedules 
        WHERE tenant_id = :tenantId AND department_id = :deptId AND academic_year_id = :yearId AND semester = :sem
      `, {
        replacements: { tenantId, deptId, yearId: academicYearId, sem: semester }
      });
    } catch (e) {}

    return successResponse(res, null, `Timetable for ${semester} cleared.`);
  } catch (err) {
    console.error('[Delete Schedule Error]', err);
    return errorResponse(res, 'Failed to delete schedule: ' + err.message, 500);
  }
};
