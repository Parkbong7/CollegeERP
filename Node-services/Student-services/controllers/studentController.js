const { Op } = require('sequelize');
const Joi = require('joi');
const models = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');

exports.searchStudents = async (req, res) => {
  try {
    const { query, rollNumber, departmentId, academicYearId, all } = req.query;
    const tenantId = req.tenantId;

    const where = { tenant_id: tenantId, status: 'active' };

    if (departmentId) {
      where.department_id = departmentId;
    }

    if (academicYearId) {
      where.academic_year_id = academicYearId;
    }

    if (rollNumber && rollNumber.trim()) {
      where.roll_number = { [Op.iLike]: `%${rollNumber.trim()}%` };
    }

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: q } },
        { roll_number: { [Op.iLike]: q } },
        { email: { [Op.iLike]: q } }
      ];
    }

    const students = await models.Student.findAll({
      where,
      include: [
        {
          model: models.Department,
          attributes: ['id', 'code', 'name']
        },
        {
          model: models.AcademicYear,
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['roll_number', 'ASC']]
    });

    return successResponse(res, students);
  } catch (err) {
    console.error('[Search Students Error]', err);
    return errorResponse(res, 'Failed to search students', 500);
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const student = await models.Student.findOne({
      where: { id, tenant_id: tenantId },
      include: [
        {
          model: models.Department,
          attributes: ['id', 'code', 'name']
        },
        {
          model: models.AcademicYear,
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    if (!student) {
      return errorResponse(res, 'Student record not found', 404);
    }

    // Resolve HOD assigned to student's department
    const hodAssignment = await models.HODAssignment.findOne({
      where: {
        tenant_id: tenantId,
        department_id: student.department_id,
        is_active: true
      },
      include: [
        {
          model: models.Staff,
          attributes: ['id', 'name', 'employee_id', 'email', 'designation']
        }
      ]
    });

    const hodName = hodAssignment && hodAssignment.Staff ? hodAssignment.Staff.name : 'Not Assigned';

    return successResponse(res, {
      id: student.id,
      name: student.name,
      rollNumber: student.roll_number,
      email: student.email,
      phone: student.phone,
      semester: student.semester,
      cgpa: student.cgpa,
      departmentId: student.department_id,
      department: student.Department ? `${student.Department.code} - ${student.Department.name}` : 'N/A',
      academicYearId: student.academic_year_id,
      academicYear: student.AcademicYear ? student.AcademicYear.name : 'N/A',
      hodName,
      status: student.status
    });
  } catch (err) {
    console.error('[Get Student By Id Error]', err);
    return errorResponse(res, 'Failed to retrieve student details', 500);
  }
};

/**
 * Subject retrieval logic:
 * 1. Retrieve the student's authenticated tenant context.
 * 2. Retrieve the student's department.
 * 3. Retrieve the student's academic year.
 * 4. Retrieve the HOD assigned to that department.
 * 5. Fetch subjects matching the student's department AND academic year.
 * 6. Display those subjects.
 * Never display subjects from unrelated departments or academic years.
 */
exports.getStudentSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // 1 & 2 & 3. Retrieve student with tenant, department, academic year
    const student = await models.Student.findOne({
      where: { id, tenant_id: tenantId },
      include: [
        { model: models.Department, attributes: ['id', 'code', 'name'] },
        { model: models.AcademicYear, attributes: ['id', 'code', 'name'] }
      ]
    });

    if (!student) {
      return errorResponse(res, 'Student not found in institutional records', 404);
    }

    // 4. Retrieve HOD assigned to student's department
    const hodAssignment = await models.HODAssignment.findOne({
      where: {
        tenant_id: tenantId,
        department_id: student.department_id,
        is_active: true
      },
      include: [
        {
          model: models.Staff,
          attributes: ['id', 'name', 'employee_id', 'designation']
        }
      ]
    });
    const hodName = hodAssignment && hodAssignment.Staff ? hodAssignment.Staff.name : 'Not Assigned';

    // 5. Fetch subjects matching the student's department AND academic year strictly
    const subjects = await models.Subject.findAll({
      where: {
        tenant_id: tenantId,
        department_id: student.department_id,
        academic_year_id: student.academic_year_id,
        status: 'active'
      },
      order: [['code', 'ASC']]
    });

    // 6. Look up assigned staff for each subject in this department & year
    const subjectsWithStaff = await Promise.all(
      subjects.map(async (sub) => {
        const assignment = await models.StaffSubjectAssignment.findOne({
          where: {
            tenant_id: tenantId,
            subject_id: sub.id,
            academic_year_id: student.academic_year_id,
            is_active: true
          },
          include: [
            {
              model: models.Staff,
              attributes: ['id', 'name', 'employee_id', 'designation']
            }
          ]
        });

        return {
          id: sub.id,
          code: sub.code,
          name: sub.name,
          semester: sub.semester,
          credits: sub.credits,
          status: sub.status,
          assignedStaff: assignment && assignment.Staff ? assignment.Staff.name : 'Unassigned',
          staffEmployeeId: assignment && assignment.Staff ? assignment.Staff.employee_id : null
        };
      })
    );

    return successResponse(res, {
      student: {
        id: student.id,
        name: student.name,
        rollNumber: student.roll_number,
        department: student.Department ? `${student.Department.code} - ${student.Department.name}` : 'N/A',
        departmentCode: student.Department ? student.Department.code : 'N/A',
        academicYear: student.AcademicYear ? student.AcademicYear.name : 'N/A',
        academicYearCode: student.AcademicYear ? student.AcademicYear.code : 'N/A',
        hodName
      },
      subjects: subjectsWithStaff
    });
  } catch (err) {
    console.error('[Get Student Subjects Error]', err);
    return errorResponse(res, 'Failed to fetch student subjects', 500);
  }
};

exports.createStudent = async (req, res) => {
  try {
    const schema = Joi.object({
      departmentId: Joi.string().uuid().required(),
      academicYearId: Joi.string().uuid().required(),
      rollNumber: Joi.string().required(),
      name: Joi.string().required(),
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
      semester: Joi.string().default('Semester 1'),
      cgpa: Joi.number().min(0).max(10).default(0.0)
    });

    const { error, value } = schema.validate(req.body);
    if (error) return errorResponse(res, error.details[0].message, 400);

    // Prevent duplicate student roll number in this tenant
    const existing = await models.Student.findOne({
      where: {
        tenant_id: req.tenantId,
        roll_number: value.rollNumber.trim()
      }
    });

    if (existing) {
      return errorResponse(res, `Student with Roll Number '${value.rollNumber}' already exists.`, 409);
    }

    const student = await models.Student.create({
      tenant_id: req.tenantId,
      department_id: value.departmentId,
      academic_year_id: value.academicYearId,
      roll_number: value.rollNumber.trim(),
      name: value.name.trim(),
      email: value.email || null,
      phone: value.phone || null,
      semester: value.semester,
      cgpa: value.cgpa,
      status: 'active'
    });

    return successResponse(res, student, 'Student enrolled successfully', 201);
  } catch (err) {
    console.error('[Create Student Error]', err);
    return errorResponse(res, 'Failed to create student record', 500);
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await models.Student.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!student) return errorResponse(res, 'Student not found', 404);

    await student.update(req.body);
    return successResponse(res, student, 'Student record updated successfully');
  } catch (err) {
    console.error('[Update Student Error]', err);
    return errorResponse(res, 'Failed to update student', 500);
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await models.Student.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!student) return errorResponse(res, 'Student not found', 404);

    await student.destroy();
    return successResponse(res, null, 'Student record deleted successfully');
  } catch (err) {
    console.error('[Delete Student Error]', err);
    return errorResponse(res, 'Failed to delete student', 500);
  }
};
