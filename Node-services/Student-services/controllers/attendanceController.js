const models = require('../models');
const { Op } = require('sequelize');

const successResponse = (res, data, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    message,
    status
  });
};

const errorResponse = (res, message = 'Internal Server Error', status = 500, details = null) => {
  return res.status(status).json({
    success: false,
    error: {
      message,
      status,
      details
    }
  });
};

/**
 * 1. Mark Attendance (Staff & Super Admin)
 * POST /attendance/mark
 */
exports.markAttendance = async (req, res) => {
  try {
    const { academicYearId, departmentId, subjectId, date, records } = req.body;
    const tenantId = req.tenantId;
    const staffId = req.user?.staffId || null;

    if (!academicYearId || !departmentId || !subjectId || !date || !Array.isArray(records)) {
      return errorResponse(res, 'Academic Year, Department, Subject, Date, and Records array are required', 400);
    }

    if (records.length === 0) {
      return errorResponse(res, 'At least one student attendance record is required', 400);
    }

    const savedRecords = [];
    for (const rec of records) {
      if (!rec.studentId) continue;
      const status = ['present', 'absent', 'late'].includes(rec.status) ? rec.status : 'present';

      // Upsert attendance entry
      const [entry] = await models.Attendance.upsert({
        tenant_id: tenantId,
        student_id: rec.studentId,
        subject_id: subjectId,
        academic_year_id: academicYearId,
        department_id: departmentId,
        staff_id: staffId,
        date: date,
        status: status,
        remarks: rec.remarks || null
      }, { returning: true });

      savedRecords.push(entry);
    }

    return successResponse(res, {
      count: savedRecords.length,
      date,
      subjectId
    }, `Successfully recorded attendance for ${savedRecords.length} student${savedRecords.length === 1 ? '' : 's'}.`, 201);
  } catch (err) {
    console.error('[Mark Attendance Error]', err);
    return errorResponse(res, 'Failed to save attendance records: ' + err.message, 500);
  }
};

/**
 * 2. Get Class Attendance Sheet
 * GET /attendance/sheet
 * Query: departmentId, academicYearId, subjectId, date
 */
exports.getAttendanceSheet = async (req, res) => {
  try {
    const { departmentId, academicYearId, subjectId, date } = req.query;
    const tenantId = req.tenantId;

    if (!departmentId || !academicYearId) {
      return errorResponse(res, 'departmentId and academicYearId are required', 400);
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    // Fetch enrolled students for this cohort
    const students = await models.Student.findAll({
      where: {
        tenant_id: tenantId,
        department_id: departmentId,
        academic_year_id: academicYearId,
        status: 'active'
      },
      order: [['roll_number', 'ASC']]
    });

    // Fetch existing attendance for this subject and date if provided
    let attendanceMap = {};
    if (subjectId) {
      const existing = await models.Attendance.findAll({
        where: {
          tenant_id: tenantId,
          subject_id: subjectId,
          date: attendanceDate
        }
      });
      existing.forEach((att) => {
        attendanceMap[att.student_id] = att;
      });
    }

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    const sheet = students.map((stu) => {
      const att = attendanceMap[stu.id];
      const status = att ? att.status : 'present';
      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'late') lateCount++;

      return {
        id: stu.id,
        rollNumber: stu.roll_number,
        name: stu.name,
        email: stu.email,
        semester: stu.semester,
        status,
        remarks: att ? att.remarks : '',
        isMarked: !!att,
        updatedAt: att ? att.updated_at : null
      };
    });

    const total = students.length;
    const percentage = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;

    return successResponse(res, {
      date: attendanceDate,
      totalStudents: total,
      presentCount,
      absentCount,
      lateCount,
      attendancePercentage: percentage,
      students: sheet
    });
  } catch (err) {
    console.error('[Get Attendance Sheet Error]', err);
    return errorResponse(res, 'Failed to fetch attendance sheet', 500);
  }
};

/**
 * 3. Helper to format a student's attendance statistics
 */
async function computeStudentStats(tenantId, studentId) {
  const student = await models.Student.findOne({
    where: { id: studentId, tenant_id: tenantId },
    include: [
      { model: models.Department, attributes: ['id', 'code', 'name'] },
      { model: models.AcademicYear, attributes: ['id', 'code', 'name'] }
    ]
  });

  if (!student) return null;

  const records = await models.Attendance.findAll({
    where: { tenant_id: tenantId, student_id: studentId },
    include: [
      { model: models.Subject, attributes: ['id', 'code', 'name', 'semester'] }
    ],
    order: [['date', 'DESC']]
  });

  const totalClasses = records.length;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;

  const subjectMap = {};
  records.forEach((r) => {
    if (r.status === 'present') presentCount++;
    else if (r.status === 'absent') absentCount++;
    else if (r.status === 'late') lateCount++;

    const subKey = r.subject_id;
    if (!subjectMap[subKey]) {
      subjectMap[subKey] = {
        subjectId: r.subject_id,
        code: r.Subject ? r.Subject.code : 'SUB',
        name: r.Subject ? r.Subject.name : 'Curriculum Subject',
        semester: r.Subject ? r.Subject.semester : 'Semester 1',
        total: 0,
        present: 0,
        absent: 0,
        late: 0
      };
    }
    subjectMap[subKey].total++;
    if (r.status === 'present') subjectMap[subKey].present++;
    else if (r.status === 'absent') subjectMap[subKey].absent++;
    else if (r.status === 'late') subjectMap[subKey].late++;
  });

  // Calculate subject-wise percentages
  const subjectBreakdown = Object.values(subjectMap).map((s) => ({
    ...s,
    percentage: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0
  }));

  const overallPercentage = totalClasses > 0 
    ? Math.round(((presentCount + lateCount) / totalClasses) * 100)
    : 100;

  return {
    student: {
      id: student.id,
      name: student.name,
      rollNumber: student.roll_number,
      email: student.email,
      department: student.Department ? `${student.Department.code} - ${student.Department.name}` : 'N/A',
      academicYear: student.AcademicYear ? student.AcademicYear.name : 'N/A',
      semester: student.semester
    },
    statistics: {
      totalClasses,
      presentCount,
      absentCount,
      lateCount,
      overallPercentage,
      isEligible: overallPercentage >= 75,
      eligibilityMessage: overallPercentage >= 75 
        ? 'Eligible for End-Semester Examinations' 
        : 'Attendance Shortage (<75%) - Needs Condonation'
    },
    subjectBreakdown,
    recentLogs: records.slice(0, 30).map((r) => ({
      id: r.id,
      date: r.date,
      status: r.status,
      remarks: r.remarks,
      subjectCode: r.Subject ? r.Subject.code : 'SUB',
      subjectName: r.Subject ? r.Subject.name : 'Subject'
    }))
  };
}

/**
 * 4. Get Logged In Student Attendance
 * GET /attendance/my-attendance
 */
exports.getMyAttendance = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    let targetStudentId = req.user?.studentId;

    // If studentId not in JWT, find by user email or username or first student
    if (!targetStudentId) {
      const foundStudent = await models.Student.findOne({
        where: {
          tenant_id: tenantId,
          [Op.or]: [
            { email: req.user?.email },
            { roll_number: req.user?.username }
          ]
        }
      });
      if (foundStudent) targetStudentId = foundStudent.id;
    }

    if (!targetStudentId) {
      // Default fallback: first student for demo
      const firstStudent = await models.Student.findOne({ where: { tenant_id: tenantId } });
      if (firstStudent) targetStudentId = firstStudent.id;
    }

    if (!targetStudentId) {
      return errorResponse(res, 'Student profile not associated with this account', 404);
    }

    const data = await computeStudentStats(tenantId, targetStudentId);
    if (!data) return errorResponse(res, 'Student attendance data not found', 404);

    return successResponse(res, data);
  } catch (err) {
    console.error('[Get My Attendance Error]', err);
    return errorResponse(res, 'Failed to fetch personal attendance data', 500);
  }
};

/**
 * 5. Get Specific Student Attendance (Staff, HOD, Super Admin)
 * GET /attendance/student/:studentId
 */
exports.getStudentAttendance = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { studentId } = req.params;

    const data = await computeStudentStats(tenantId, studentId);
    if (!data) return errorResponse(res, 'Student not found', 404);

    return successResponse(res, data);
  } catch (err) {
    console.error('[Get Student Attendance Error]', err);
    return errorResponse(res, 'Failed to fetch student attendance', 500);
  }
};

/**
 * 6. Get Attendance Summary & Analytics
 * GET /attendance/summary
 */
exports.getAttendanceSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { departmentId, academicYearId } = req.query;

    const where = { tenant_id: tenantId };
    if (departmentId) where.department_id = departmentId;
    if (academicYearId) where.academic_year_id = academicYearId;

    const totalRecords = await models.Attendance.count({ where });
    const presentRecords = await models.Attendance.count({ where: { ...where, status: 'present' } });
    const absentRecords = await models.Attendance.count({ where: { ...where, status: 'absent' } });
    const lateRecords = await models.Attendance.count({ where: { ...where, status: 'late' } });

    const totalStudents = await models.Student.count({ where });

    return successResponse(res, {
      totalStudents,
      totalSessions: totalRecords,
      presentRecords,
      absentRecords,
      lateRecords,
      overallPercentage: totalRecords > 0 ? Math.round(((presentRecords + lateRecords) / totalRecords) * 100) : 0
    });
  } catch (err) {
    console.error('[Get Attendance Summary Error]', err);
    return errorResponse(res, 'Failed to fetch attendance summary', 500);
  }
};
