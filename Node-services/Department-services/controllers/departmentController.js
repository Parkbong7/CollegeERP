const { Op } = require('sequelize');
const Joi = require('joi');
const models = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// -------------------------------------------------------------
// 7.1 Student subject lookup / entry workflow
// -------------------------------------------------------------
exports.studentSubjectLookup = async (req, res) => {
  try {
    const { rollNumber, studentName, departmentId, academicYearId } = req.query;
    const tenantId = req.tenantId;

    const roll = typeof rollNumber === 'string' ? rollNumber.trim() : Array.isArray(rollNumber) ? rollNumber[0].trim() : '';
    const sName = typeof studentName === 'string' ? studentName.trim() : Array.isArray(studentName) ? studentName[0].trim() : '';

    // If no parameters at all were passed, error
    if (!roll && !sName && !departmentId && !academicYearId) {
      return errorResponse(res, 'Please provide at least one filter (Department, Academic Year, Roll Number, or Student Name).', 400);
    }

    // Build student search condition
    const studentWhere = { tenant_id: tenantId, status: 'active' };
    if (roll) {
      studentWhere.roll_number = { [Op.iLike]: `%${roll}%` };
    }
    if (sName) {
      studentWhere.name = { [Op.iLike]: `%${sName}%` };
    }
    if (departmentId) {
      studentWhere.department_id = departmentId;
    }
    if (academicYearId) {
      studentWhere.academic_year_id = academicYearId;
    }

    // Find matching students
    const matchingStudents = await models.Student.findAll({
      where: studentWhere,
      include: [
        { model: models.Department, attributes: ['id', 'code', 'name'] },
        { model: models.AcademicYear, attributes: ['id', 'code', 'name'] }
      ],
      order: [['roll_number', 'ASC']]
    });

    // Determine target student ONLY if roll or studentName was queried
    const student = (roll || sName) && matchingStudents.length > 0 ? matchingStudents[0] : null;

    // Determine target department and year for curriculum subjects
    const targetDeptId = student ? student.department_id : departmentId || null;
    const targetYearId = student ? student.academic_year_id : academicYearId || null;

    // Resolve Department & HOD
    let resolvedDept = student ? student.Department : null;
    if (!resolvedDept && targetDeptId) {
      resolvedDept = await models.Department.findOne({ where: { id: targetDeptId, tenant_id: tenantId } });
    }

    let hodName = 'Not Assigned';
    if (targetDeptId) {
      const hodAssignment = await models.HODAssignment.findOne({
        where: {
          tenant_id: tenantId,
          department_id: targetDeptId,
          is_active: true
        },
        include: [
          { model: models.Staff, attributes: ['id', 'name', 'employee_id', 'designation'] }
        ]
      });
      if (hodAssignment && hodAssignment.Staff) {
        hodName = hodAssignment.Staff.name;
      }
    } else if (targetYearId && !targetDeptId) {
      hodName = 'Institutional Roster (All Departments)';
    }

    // Resolve Academic Year
    let resolvedYear = student ? student.AcademicYear : null;
    if (!resolvedYear && targetYearId) {
      resolvedYear = await models.AcademicYear.findOne({ where: { id: targetYearId, tenant_id: tenantId } });
    }

    // Build subject query condition
    const subjectWhere = { tenant_id: tenantId, status: 'active' };
    if (targetDeptId) subjectWhere.department_id = targetDeptId;
    if (targetYearId) subjectWhere.academic_year_id = targetYearId;

    const subjects = await models.Subject.findAll({
      where: subjectWhere,
      include: [
        { model: models.Department, attributes: ['id', 'code', 'name'] },
        { model: models.AcademicYear, attributes: ['id', 'code', 'name'] }
      ],
      order: [['code', 'ASC']]
    });

    // Look up assigned staff for each subject
    const subjectsWithStaff = await Promise.all(
      subjects.map(async (sub) => {
        const assignmentWhere = {
          tenant_id: tenantId,
          subject_id: sub.id,
          is_active: true
        };
        if (targetYearId) assignmentWhere.academic_year_id = targetYearId;

        const assignment = await models.StaffSubjectAssignment.findOne({
          where: assignmentWhere,
          include: [{ model: models.Staff, attributes: ['name', 'employee_id'] }]
        });

        return {
          subjectCode: sub.code,
          subjectName: sub.name,
          semester: sub.semester,
          credits: sub.credits,
          academicYear: sub.AcademicYear ? sub.AcademicYear.name : (resolvedYear ? resolvedYear.name : 'N/A'),
          department: sub.Department ? `${sub.Department.code} - ${sub.Department.name}` : (resolvedDept ? `${resolvedDept.code} - ${resolvedDept.name}` : 'N/A'),
          assignedStaff: assignment && assignment.Staff ? assignment.Staff.name : 'Unassigned',
          staffId: assignment && assignment.Staff ? assignment.Staff.employee_id : null
        };
      })
    );

    return successResponse(res, {
      student: student ? {
        id: student.id,
        name: student.name,
        rollNumber: student.roll_number,
        department: student.Department ? `${student.Department.code} - ${student.Department.name}` : (resolvedDept ? `${resolvedDept.code} - ${resolvedDept.name}` : 'N/A'),
        departmentId: student.department_id,
        academicYear: student.AcademicYear ? student.AcademicYear.name : (resolvedYear ? resolvedYear.name : 'N/A'),
        academicYearId: student.academic_year_id,
        hodName
      } : null,
      department: resolvedDept ? {
        id: resolvedDept.id,
        code: resolvedDept.code,
        name: resolvedDept.name,
        hodName
      } : null,
      academicYear: resolvedYear ? {
        id: resolvedYear.id,
        code: resolvedYear.code,
        name: resolvedYear.name
      } : null,
      matchingStudents: matchingStudents.map(s => ({
        id: s.id,
        name: s.name,
        rollNumber: s.roll_number,
        department: s.Department?.code,
        academicYear: s.AcademicYear?.name
      })),
      subjects: subjectsWithStaff
    });
  } catch (err) {
    console.error('[Student Subject Lookup Error]', err);
    return errorResponse(res, 'Failed to complete student subject lookup', 500);
  }
};

// -------------------------------------------------------------
// 7.2 HOD staff and teaching overview
// -------------------------------------------------------------
exports.getHODStaffOverview = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentUser = req.user;

    let targetHodStaffId = null;

    // Institutional tenant overview: allow inspecting any department HOD
    if (req.query.hodStaffId) {
      targetHodStaffId = req.query.hodStaffId;
    } else if (currentUser.role === 'HOD' && currentUser.staffId) {
      targetHodStaffId = currentUser.staffId;
    } else {
      const firstHod = await models.HODAssignment.findOne({
        where: { tenant_id: tenantId, is_active: true }
      });
      if (firstHod) targetHodStaffId = firstHod.staff_id;
    }

    if (!targetHodStaffId) {
      return errorResponse(res, 'No active HOD assignment found.', 404);
    }

    // 1. Fetch HOD's assigned department
    const hodAssignment = await models.HODAssignment.findOne({
      where: {
        tenant_id: tenantId,
        staff_id: targetHodStaffId,
        is_active: true
      },
      include: [
        { model: models.Staff, attributes: ['id', 'name', 'employee_id', 'email', 'designation'] },
        { model: models.Department, attributes: ['id', 'code', 'name'] }
      ]
    });

    if (!hodAssignment) {
      return errorResponse(res, 'Selected staff member is not currently assigned as an active HOD.', 404);
    }

    const deptId = hodAssignment.department_id;
    const department = hodAssignment.Department;
    const hodStaff = hodAssignment.Staff;

    // 2. Fetch the department's staff members
    const staffMembers = await models.Staff.findAll({
      where: {
        tenant_id: tenantId,
        department_id: deptId,
        status: 'active'
      },
      order: [['name', 'ASC']]
    });

    // 3. For each staff member, fetch subjects teaching and academic years
    const staffTable = await Promise.all(
      staffMembers.map(async (st) => {
        const assignments = await models.StaffSubjectAssignment.findAll({
          where: {
            tenant_id: tenantId,
            staff_id: st.id,
            is_active: true
          },
          include: [
            { model: models.Subject, attributes: ['code', 'name'] },
            { model: models.AcademicYear, attributes: ['name', 'code'] }
          ]
        });

        const subjectNames = assignments.map((a) => (a.Subject ? a.Subject.name : null)).filter(Boolean);
        const yearNames = [...new Set(assignments.map((a) => (a.AcademicYear ? a.AcademicYear.name : null)).filter(Boolean))];

        return {
          staffId: st.employee_id,
          staffName: st.name,
          designation: st.designation,
          email: st.email,
          phone: st.phone,
          subjectsTeaching: subjectNames.length > 0 ? subjectNames.join(', ') : 'No subjects assigned',
          academicYears: yearNames.length > 0 ? yearNames.join(', ') : 'None'
        };
      })
    );

    return successResponse(res, {
      hod: {
        id: hodStaff.id,
        employeeId: hodStaff.employee_id,
        name: hodStaff.name,
        designation: hodStaff.designation
      },
      department: {
        id: department.id,
        code: department.code,
        name: department.name
      },
      staff: staffTable
    });
  } catch (err) {
    console.error('[HOD Staff Overview Error]', err);
    return errorResponse(res, 'Failed to retrieve HOD staff overview', 500);
  }
};

exports.getHODList = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const hods = await models.HODAssignment.findAll({
      where: { tenant_id: tenantId, is_active: true },
      include: [
        { model: models.Staff, attributes: ['id', 'name', 'employee_id', 'designation'] },
        { model: models.Department, attributes: ['id', 'code', 'name'] }
      ]
    });

    const formatted = hods.map((h) => ({
      hodStaffId: h.Staff ? h.Staff.id : null,
      staffName: h.Staff ? h.Staff.name : 'Unknown',
      employeeId: h.Staff ? h.Staff.employee_id : 'Unknown',
      departmentCode: h.Department ? h.Department.code : 'N/A',
      departmentName: h.Department ? h.Department.name : 'N/A',
      departmentId: h.department_id
    }));

    return successResponse(res, formatted);
  } catch (err) {
    console.error('[Get HOD List Error]', err);
    return errorResponse(res, 'Failed to fetch HOD list', 500);
  }
};

exports.getDepartmentOverview = async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await models.Department.findOne({
      where: { id, tenant_id: req.tenantId },
      include: [{ model: models.Staff }, { model: models.Student }, { model: models.Subject }]
    });

    if (!dept) return errorResponse(res, 'Department not found', 404);
    return successResponse(res, dept);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch department', 500);
  }
};
