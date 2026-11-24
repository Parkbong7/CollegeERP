const { Op } = require('sequelize');
const Joi = require('joi');
const models = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// -------------------------------------------------------------
// 1. Year Master
// -------------------------------------------------------------
exports.getAllYears = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const years = await models.AcademicYear.findAll({
      where: { tenant_id: tenantId },
      order: [['code', 'ASC']]
    });

    // Compute subject counts for each year
    const results = await Promise.all(
      years.map(async (y, idx) => {
        const count = await models.Subject.count({
          where: {
            tenant_id: tenantId,
            academic_year_id: y.id,
            status: 'active'
          }
        });
        return {
          serialNo: idx + 1,
          id: y.id,
          name: y.name,
          code: y.code,
          startDate: y.start_date,
          endDate: y.end_date,
          status: y.status,
          subjectCount: count
        };
      })
    );

    return successResponse(res, results);
  } catch (err) {
    console.error('[Get Years Error]', err);
    return errorResponse(res, 'Failed to fetch academic years', 500);
  }
};

exports.getYearById = async (req, res) => {
  try {
    const { id } = req.params;
    const year = await models.AcademicYear.findOne({
      where: { id, tenant_id: req.tenantId }
    });

    if (!year) {
      return errorResponse(res, 'Academic year not found', 404);
    }

    return successResponse(res, year);
  } catch (err) {
    console.error('[Get Year By Id Error]', err);
    return errorResponse(res, 'Failed to fetch academic year', 500);
  }
};

exports.getYearSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const year = await models.AcademicYear.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!year) {
      return errorResponse(res, 'Academic year not found', 404);
    }

    const subjects = await models.Subject.findAll({
      where: {
        tenant_id: tenantId,
        academic_year_id: id
      },
      include: [
        {
          model: models.Department,
          attributes: ['id', 'code', 'name']
        },
        {
          model: models.StaffSubjectAssignment,
          where: { tenant_id: tenantId, academic_year_id: id, is_active: true },
          required: false,
          include: [
            {
              model: models.Staff,
              attributes: ['id', 'name', 'employee_id', 'designation']
            }
          ]
        }
      ],
      order: [['code', 'ASC']]
    });

    const formatted = subjects.map((s) => {
      const assignment = s.StaffSubjectAssignments && s.StaffSubjectAssignments.length > 0 ? s.StaffSubjectAssignments[0] : null;
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        semester: s.semester,
        credits: s.credits,
        status: s.status,
        department: s.Department ? `${s.Department.code} - ${s.Department.name}` : 'N/A',
        departmentCode: s.Department ? s.Department.code : 'N/A',
        departmentId: s.department_id,
        academicYearId: s.academic_year_id,
        assignmentId: assignment ? assignment.id : null,
        staffId: assignment?.Staff ? assignment.Staff.id : null,
        staffName: assignment?.Staff ? assignment.Staff.name : null,
        staffEmployeeId: assignment?.Staff ? assignment.Staff.employee_id : null,
        assignedStaff: assignment?.Staff ? {
          id: assignment.Staff.id,
          name: assignment.Staff.name,
          employeeId: assignment.Staff.employee_id,
          designation: assignment.Staff.designation
        } : null
      };
    });

    return successResponse(res, {
      year: {
        id: year.id,
        name: year.name,
        code: year.code
      },
      subjects: formatted
    });
  } catch (err) {
    console.error('[Get Year Subjects Error]', err);
    return errorResponse(res, 'Failed to fetch subjects for academic year', 500);
  }
};

exports.createYear = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      code: Joi.string().required(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) return errorResponse(res, error.details[0].message, 400);

    const exists = await models.AcademicYear.findOne({
      where: { tenant_id: req.tenantId, code: value.code }
    });
    if (exists) return errorResponse(res, 'Academic year code already exists', 409);

    const newYear = await models.AcademicYear.create({
      tenant_id: req.tenantId,
      name: value.name,
      code: value.code,
      start_date: value.startDate,
      end_date: value.endDate,
      status: 'active'
    });

    return successResponse(res, newYear, 'Academic year created successfully', 201);
  } catch (err) {
    console.error('[Create Year Error]', err);
    return errorResponse(res, 'Failed to create academic year', 500);
  }
};

exports.updateYear = async (req, res) => {
  try {
    const { id } = req.params;
    const year = await models.AcademicYear.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!year) return errorResponse(res, 'Academic year not found', 404);

    await year.update(req.body);
    return successResponse(res, year, 'Academic year updated');
  } catch (err) {
    console.error('[Update Year Error]', err);
    return errorResponse(res, 'Failed to update academic year', 500);
  }
};

exports.deleteYear = async (req, res) => {
  try {
    const { id } = req.params;
    const year = await models.AcademicYear.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!year) return errorResponse(res, 'Academic year not found', 404);

    await year.destroy();
    return successResponse(res, null, 'Academic year deleted');
  } catch (err) {
    console.error('[Delete Year Error]', err);
    return errorResponse(res, 'Failed to delete academic year', 500);
  }
};

// -------------------------------------------------------------
// 2. Subject CRUD
// -------------------------------------------------------------
exports.getAllSubjects = async (req, res) => {
  try {
    const { departmentId, academicYearId } = req.query;
    const where = { tenant_id: req.tenantId, status: 'active' };
    if (departmentId) where.department_id = departmentId;
    if (academicYearId) where.academic_year_id = academicYearId;

    const subjects = await models.Subject.findAll({
      where,
      include: [
        { model: models.Department, attributes: ['id', 'code', 'name'] },
        { model: models.AcademicYear, attributes: ['id', 'code', 'name'] }
      ],
      order: [['code', 'ASC']]
    });

    const formatted = subjects.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      semester: s.semester,
      credits: s.credits,
      departmentId: s.department_id,
      academicYearId: s.academic_year_id,
      department: s.Department ? `${s.Department.code} - ${s.Department.name}` : 'N/A',
      academicYear: s.AcademicYear ? s.AcademicYear.name : 'N/A'
    }));

    return successResponse(res, formatted);
  } catch (err) {
    console.error('[Get All Subjects Error]', err);
    return errorResponse(res, 'Failed to fetch subjects', 500);
  }
};

exports.createSubject = async (req, res) => {
  try {
    const schema = Joi.object({
      departmentId: Joi.string().uuid().required(),
      academicYearId: Joi.string().uuid().required(),
      code: Joi.string().required(),
      name: Joi.string().required(),
      semester: Joi.string().required(),
      credits: Joi.number().integer().min(1).max(10).default(3),
      staffId: Joi.string().uuid().optional().allow('', null)
    });

    const { error, value } = schema.validate(req.body);
    if (error) return errorResponse(res, error.details[0].message, 400);

    const exists = await models.Subject.findOne({
      where: {
        tenant_id: req.tenantId,
        department_id: value.departmentId,
        academic_year_id: value.academicYearId,
        code: value.code
      }
    });
    if (exists) return errorResponse(res, 'Subject code already exists in this department and year', 409);

    const subject = await models.Subject.create({
      tenant_id: req.tenantId,
      department_id: value.departmentId,
      academic_year_id: value.academicYearId,
      code: value.code,
      name: value.name,
      semester: value.semester,
      credits: value.credits,
      status: 'active'
    });

    let assignment = null;
    let staffName = null;
    if (value.staffId) {
      assignment = await models.StaffSubjectAssignment.create({
        tenant_id: req.tenantId,
        staff_id: value.staffId,
        subject_id: subject.id,
        academic_year_id: value.academicYearId,
        department_id: value.departmentId,
        is_active: true
      });
      const staffMember = await models.Staff.findByPk(value.staffId, { attributes: ['id', 'name'] });
      staffName = staffMember ? staffMember.name : null;
    }

    const resData = subject.toJSON();
    if (assignment) {
      resData.assignmentId = assignment.id;
      resData.staffId = value.staffId;
      resData.staffName = staffName;
    }

    return successResponse(res, resData, 'Subject created successfully', 201);
  } catch (err) {
    console.error('[Create Subject Error]', err);
    return errorResponse(res, 'Failed to create subject', 500);
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await models.Subject.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!subject) return errorResponse(res, 'Subject not found', 404);

    await subject.update(req.body);
    return successResponse(res, subject, 'Subject updated successfully');
  } catch (err) {
    console.error('[Update Subject Error]', err);
    return errorResponse(res, 'Failed to update subject', 500);
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await models.Subject.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!subject) return errorResponse(res, 'Subject not found', 404);

    await subject.destroy();
    return successResponse(res, null, 'Subject deleted successfully');
  } catch (err) {
    console.error('[Delete Subject Error]', err);
    return errorResponse(res, 'Failed to delete subject', 500);
  }
};

// -------------------------------------------------------------
// 3. Staff Master
// -------------------------------------------------------------
exports.searchStaff = async (req, res) => {
  try {
    const { query, departmentId, all } = req.query;
    const tenantId = req.tenantId;

    const where = { tenant_id: tenantId, status: 'active' };

    if (departmentId) {
      where.department_id = departmentId;
    }

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: q } },
        { employee_id: { [Op.iLike]: q } },
        { email: { [Op.iLike]: q } }
      ];
    } else if (all !== 'true') {
      // If no query and not view-all, return empty or top dropdown list
    }

    const staffList = await models.Staff.findAll({
      where,
      include: [
        {
          model: models.Department,
          attributes: ['id', 'code', 'name']
        }
      ],
      order: [['name', 'ASC']]
    });

    return successResponse(res, staffList);
  } catch (err) {
    console.error('[Search Staff Error]', err);
    return errorResponse(res, 'Failed to search staff', 500);
  }
};

exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const staff = await models.Staff.findOne({
      where: { id, tenant_id: tenantId },
      include: [
        {
          model: models.Department,
          attributes: ['id', 'code', 'name']
        }
      ]
    });

    if (!staff) {
      return errorResponse(res, 'Staff member not found', 404);
    }

    // Check HOD status
    const hod = await models.HODAssignment.findOne({
      where: { tenant_id: tenantId, staff_id: staff.id, is_active: true }
    });

    return successResponse(res, {
      id: staff.id,
      name: staff.name,
      employeeId: staff.employee_id,
      email: staff.email,
      phone: staff.phone,
      department: staff.Department ? `${staff.Department.code} - ${staff.Department.name}` : 'N/A',
      departmentId: staff.department_id,
      designation: staff.designation,
      isHod: !!hod,
      status: staff.status
    });
  } catch (err) {
    console.error('[Get Staff By Id Error]', err);
    return errorResponse(res, 'Failed to retrieve staff details', 500);
  }
};

exports.getStaffAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const assignments = await models.StaffSubjectAssignment.findAll({
      where: {
        tenant_id: tenantId,
        staff_id: id,
        is_active: true
      },
      include: [
        {
          model: models.Subject,
          attributes: ['id', 'code', 'name', 'semester', 'credits']
        },
        {
          model: models.AcademicYear,
          attributes: ['id', 'name', 'code']
        },
        {
          model: models.Department,
          attributes: ['id', 'code', 'name']
        }
      ]
    });

    const formatted = assignments.map((a) => ({
      assignmentId: a.id,
      id: a.id,
      subjectId: a.Subject ? a.Subject.id : a.subject_id,
      subjectCode: a.Subject ? a.Subject.code : 'N/A',
      subjectName: a.Subject ? a.Subject.name : 'N/A',
      semester: a.Subject ? a.Subject.semester : 'N/A',
      academicYearId: a.AcademicYear ? a.AcademicYear.id : a.academic_year_id,
      academicYear: a.AcademicYear ? a.AcademicYear.name : 'N/A',
      departmentId: a.Department ? a.Department.id : a.department_id,
      department: a.Department ? a.Department.code : 'N/A',
      status: 'Active'
    }));

    return successResponse(res, formatted);
  } catch (err) {
    console.error('[Get Staff Assignments Error]', err);
    return errorResponse(res, 'Failed to fetch staff assignments', 500);
  }
};

exports.createStaffAssignment = async (req, res) => {
  try {
    const schema = Joi.object({
      staffId: Joi.string().uuid().required(),
      subjectId: Joi.string().uuid().required(),
      academicYearId: Joi.string().uuid().optional(),
      departmentId: Joi.string().uuid().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) return errorResponse(res, error.details[0].message, 400);

    const subject = await models.Subject.findOne({
      where: { id: value.subjectId, tenant_id: req.tenantId }
    });
    if (!subject) return errorResponse(res, 'Subject not found', 404);

    const staff = await models.Staff.findOne({
      where: { id: value.staffId, tenant_id: req.tenantId }
    });
    if (!staff) return errorResponse(res, 'Staff member not found', 404);

    const academicYearId = value.academicYearId || subject.academic_year_id;
    const departmentId = value.departmentId || subject.department_id || staff.department_id;

    const existing = await models.StaffSubjectAssignment.findOne({
      where: {
        tenant_id: req.tenantId,
        staff_id: value.staffId,
        subject_id: value.subjectId,
        academic_year_id: academicYearId
      }
    });

    if (existing) {
      if (!existing.is_active) {
        await existing.update({ is_active: true, department_id: departmentId });
        return successResponse(res, existing, 'Teaching assignment reactivated successfully');
      }
      return errorResponse(res, 'This subject is already allocated to this faculty member for the selected academic year', 409);
    }

    const assignment = await models.StaffSubjectAssignment.create({
      tenant_id: req.tenantId,
      staff_id: value.staffId,
      subject_id: value.subjectId,
      academic_year_id: academicYearId,
      department_id: departmentId,
      is_active: true
    });

    return successResponse(res, assignment, 'Subject allocated to faculty member successfully', 201);
  } catch (err) {
    console.error('[Create Staff Assignment Error]', err);
    return errorResponse(res, 'Failed to create staff assignment', 500);
  }
};

exports.updateStaffAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await models.StaffSubjectAssignment.findOne({
      where: { id: assignmentId, tenant_id: req.tenantId }
    });
    if (!assignment) return errorResponse(res, 'Staff assignment not found', 404);

    const { subjectId, academicYearId, departmentId, is_active } = req.body;
    const updateData = {};
    if (subjectId) updateData.subject_id = subjectId;
    if (academicYearId) updateData.academic_year_id = academicYearId;
    if (departmentId) updateData.department_id = departmentId;
    if (is_active !== undefined) updateData.is_active = is_active;

    await assignment.update(updateData);
    return successResponse(res, assignment, 'Staff assignment updated successfully');
  } catch (err) {
    console.error('[Update Staff Assignment Error]', err);
    return errorResponse(res, 'Failed to update staff assignment', 500);
  }
};

exports.deleteStaffAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await models.StaffSubjectAssignment.findOne({
      where: { id: assignmentId, tenant_id: req.tenantId }
    });
    if (!assignment) return errorResponse(res, 'Staff assignment not found', 404);

    await assignment.destroy();
    return successResponse(res, null, 'Staff assignment removed successfully');
  } catch (err) {
    console.error('[Delete Staff Assignment Error]', err);
    return errorResponse(res, 'Failed to remove staff assignment', 500);
  }
};

// -------------------------------------------------------------
// 4. Department Master
// -------------------------------------------------------------
exports.searchDepartments = async (req, res) => {
  try {
    const { query, code, all } = req.query;
    const tenantId = req.tenantId;

    const where = { tenant_id: tenantId, status: 'active' };

    if (code && code.trim()) {
      where.code = code.trim().toUpperCase();
    }

    if (query && query.trim()) {
      where.name = { [Op.iLike]: `%${query.trim()}%` };
    }

    const departments = await models.Department.findAll({
      where,
      order: [['code', 'ASC']]
    });

    return successResponse(res, departments);
  } catch (err) {
    console.error('[Search Departments Error]', err);
    return errorResponse(res, 'Failed to search departments', 500);
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const dept = await models.Department.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!dept) {
      return errorResponse(res, 'Department not found', 404);
    }

    // Resolve assigned active HOD
    const hodAssignment = await models.HODAssignment.findOne({
      where: {
        tenant_id: tenantId,
        department_id: dept.id,
        is_active: true
      },
      include: [
        {
          model: models.Staff,
          attributes: ['id', 'name', 'employee_id', 'email', 'phone', 'designation']
        }
      ]
    });

    // Counts
    const [totalStaff, totalStudents] = await Promise.all([
      models.Staff.count({ where: { tenant_id: tenantId, department_id: dept.id, status: 'active' } }),
      models.Student.count({ where: { tenant_id: tenantId, department_id: dept.id, status: 'active' } })
    ]);

    return successResponse(res, {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      description: dept.description,
      hod: hodAssignment && hodAssignment.Staff ? {
        id: hodAssignment.Staff.id,
        name: hodAssignment.Staff.name,
        employeeId: hodAssignment.Staff.employee_id,
        email: hodAssignment.Staff.email,
        phone: hodAssignment.Staff.phone,
        designation: hodAssignment.Staff.designation
      } : null,
      hodName: hodAssignment && hodAssignment.Staff ? hodAssignment.Staff.name : 'Not Assigned',
      totalStaff,
      totalStudents,
      status: dept.status
    });
  } catch (err) {
    console.error('[Get Department By Id Error]', err);
    return errorResponse(res, 'Failed to fetch department overview', 500);
  }
};

exports.getDepartmentStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const staffList = await models.Staff.findAll({
      where: { tenant_id: tenantId, department_id: id, status: 'active' },
      order: [['name', 'ASC']]
    });

    // For each staff, get their subjects handled and academic years handled
    const staffWithDetails = await Promise.all(
      staffList.map(async (st) => {
        const assignments = await models.StaffSubjectAssignment.findAll({
          where: { tenant_id: tenantId, staff_id: st.id, is_active: true },
          include: [
            { model: models.Subject, attributes: ['code', 'name'] },
            { model: models.AcademicYear, attributes: ['name', 'code'] }
          ]
        });

        const subjectNames = assignments.map((a) => (a.Subject ? a.Subject.name : null)).filter(Boolean);
        const yearNames = [...new Set(assignments.map((a) => (a.AcademicYear ? a.AcademicYear.name : null)).filter(Boolean))];

        return {
          id: st.id,
          name: st.name,
          employeeId: st.employee_id,
          designation: st.designation,
          email: st.email,
          phone: st.phone,
          subjectsHandled: subjectNames.length > 0 ? subjectNames.join(', ') : 'None assigned',
          academicYearsHandled: yearNames.length > 0 ? yearNames.join(', ') : 'None'
        };
      })
    );

    return successResponse(res, staffWithDetails);
  } catch (err) {
    console.error('[Get Department Staff Error]', err);
    return errorResponse(res, 'Failed to fetch department staff', 500);
  }
};

exports.getDepartmentStudentCounts = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // Fetch all academic years
    const years = await models.AcademicYear.findAll({
      where: { tenant_id: tenantId },
      order: [['code', 'ASC']]
    });

    // Dynamically calculate student count per year for this department
    const counts = await Promise.all(
      years.map(async (y) => {
        const count = await models.Student.count({
          where: {
            tenant_id: tenantId,
            department_id: id,
            academic_year_id: y.id,
            status: 'active'
          }
        });

        return {
          academicYearId: y.id,
          academicYearName: y.name,
          academicYearCode: y.code,
          studentCount: count
        };
      })
    );

    return successResponse(res, counts);
  } catch (err) {
    console.error('[Get Department Student Counts Error]', err);
    return errorResponse(res, 'Failed to calculate department student counts', 500);
  }
};

// -------------------------------------------------------------
// 5. Dynamic Creation & Assignment Endpoints (Live Master updates)
// -------------------------------------------------------------
exports.createDepartment = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      code: Joi.string().uppercase().required(),
      description: Joi.string().optional().allow('', null),
      hodStaffId: Joi.string().uuid().optional().allow('', null)
    });

    const { error, value } = schema.validate(req.body);
    if (error) return errorResponse(res, error.details[0].message, 400);

    const exists = await models.Department.findOne({
      where: { tenant_id: req.tenantId, code: value.code }
    });
    if (exists) return errorResponse(res, `Department code '${value.code}' already exists`, 409);

    const newDept = await models.Department.create({
      tenant_id: req.tenantId,
      name: value.name,
      code: value.code,
      description: value.description || '',
      status: 'active'
    });

    if (value.hodStaffId) {
      await models.HODAssignment.create({
        tenant_id: req.tenantId,
        department_id: newDept.id,
        staff_id: value.hodStaffId,
        is_active: true
      });
    }

    return successResponse(res, newDept, 'Department created successfully', 201);
  } catch (err) {
    console.error('[Create Department Error]', err);
    return errorResponse(res, 'Failed to create department', 500);
  }
};

exports.assignHOD = async (req, res) => {
  try {
    const { id } = req.params; // department id
    const { staffId } = req.body;

    if (!staffId) return errorResponse(res, 'Staff ID is required to assign HOD', 400);

    const dept = await models.Department.findOne({ where: { id, tenant_id: req.tenantId } });
    if (!dept) return errorResponse(res, 'Department not found', 404);

    const staff = await models.Staff.findOne({ where: { id: staffId, tenant_id: req.tenantId } });
    if (!staff) return errorResponse(res, 'Faculty member not found', 404);

    // Deactivate previous HOD assignments for this department
    await models.HODAssignment.update(
      { is_active: false },
      { where: { tenant_id: req.tenantId, department_id: dept.id } }
    );

    // Create new active assignment
    const assignment = await models.HODAssignment.create({
      tenant_id: req.tenantId,
      department_id: dept.id,
      staff_id: staff.id,
      is_active: true
    });

    return successResponse(res, assignment, `HOD assigned successfully: ${staff.name} is now HOD of ${dept.code}`);
  } catch (err) {
    console.error('[Assign HOD Error]', err);
    return errorResponse(res, 'Failed to assign HOD', 500);
  }
};

exports.createStaff = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      employeeId: Joi.string().required(),
      departmentId: Joi.string().uuid().required(),
      email: Joi.string().email().required(),
      designation: Joi.string().required(),
      phone: Joi.string().optional().allow('', null)
    });

    const { error, value } = schema.validate(req.body);
    if (error) return errorResponse(res, error.details[0].message, 400);

    const exists = await models.Staff.findOne({
      where: { tenant_id: req.tenantId, employee_id: value.employeeId }
    });
    if (exists) return errorResponse(res, `Faculty ID '${value.employeeId}' already registered`, 409);

    const newStaff = await models.Staff.create({
      tenant_id: req.tenantId,
      department_id: value.departmentId,
      name: value.name,
      employee_id: value.employeeId,
      email: value.email,
      designation: value.designation,
      phone: value.phone || '',
      status: 'active'
    });

    return successResponse(res, newStaff, 'Faculty member added successfully', 201);
  } catch (err) {
    console.error('[Create Staff Error]', err);
    return errorResponse(res, 'Failed to create faculty record', 500);
  }
};

// -------------------------------------------------------------
// 5. Timetable / Class Schedule in Year Master
// -------------------------------------------------------------
exports.getClassSchedule = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { academicYearId, semester, departmentId } = req.query;

    if (!academicYearId) {
      return errorResponse(res, 'academicYearId query parameter is required.', 400);
    }

    const where = {
      tenant_id: tenantId,
      academic_year_id: academicYearId
    };
    if (semester) {
      where.semester = semester;
    }
    if (departmentId) {
      where.department_id = departmentId;
    }

    const entries = await models.ClassSchedule.findAll({
      where,
      order: [
        ['day_of_week', 'ASC'],
        ['period_number', 'ASC']
      ]
    });

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

    const year = await models.AcademicYear.findOne({
      where: { id: academicYearId, tenant_id: tenantId },
      attributes: ['id', 'name', 'code']
    });

    return successResponse(res, {
      academicYear: year,
      semester,
      totalSlots: entries.length,
      entries,
      matrix
    });
  } catch (err) {
    console.error('[Get Master Class Schedule Error]', err);
    return errorResponse(res, 'Failed to fetch timetable schedule: ' + err.message, 500);
  }
};
