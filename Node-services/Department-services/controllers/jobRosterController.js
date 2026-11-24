const { Op } = require('sequelize');
const Joi = require('joi');
const models = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Helper to resolve the target department ID for HOD, Staff, or Admin
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
      // Find HOD assignment from user's staff link or email
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
  } else if (currentUser.role === 'Staff') {
    if (currentUser.departmentId) {
      deptId = currentUser.departmentId;
    } else if (currentUser.staffId) {
      const staff = await models.Staff.findByPk(currentUser.staffId);
      if (staff) deptId = staff.department_id;
    }
  }

  // If still not found and Super Admin, pick requested or first department
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
 * 1. GET /departments/job-roster
 * Retrieve daily duty roster for all staff in the HOD's department
 */
exports.getJobRoster = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentUser = req.user || {};
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const deptId = await resolveTargetDepartment(req, tenantId);

    if (!deptId) {
      return errorResponse(res, 'Department context could not be resolved.', 404);
    }

    // 1. Fetch Department Details
    const department = await models.Department.findOne({
      where: { id: deptId, tenant_id: tenantId },
      attributes: ['id', 'code', 'name']
    });

    if (!department) {
      return errorResponse(res, 'Department not found.', 404);
    }

    // 2. Fetch HOD for this department
    const hodAssignment = await models.HODAssignment.findOne({
      where: { department_id: deptId, tenant_id: tenantId, is_active: true },
      include: [{ model: models.Staff, attributes: ['id', 'name', 'email', 'designation'] }]
    });

    const hodStaffId = hodAssignment?.staff_id || hodAssignment?.Staff?.id || null;

    // 3. Fetch active staff of this department
    // RULES:
    // a) Staff members should ONLY see their own assigned duty (not other staff)
    // b) HODs / Admins see departmental faculty EXCLUDING the HOD themself!
    const staffWhere = {
      department_id: deptId,
      tenant_id: tenantId,
      status: 'active'
    };

    if (currentUser.role === 'Staff') {
      let currentStaffId = currentUser.staffId;
      if (!currentStaffId && currentUser.email) {
        const staffRec = await models.Staff.findOne({
          where: { tenant_id: tenantId, email: currentUser.email }
        });
        if (staffRec) currentStaffId = staffRec.id;
      }
      if (currentStaffId) {
        staffWhere.id = currentStaffId;
      }
    } else {
      // Exclude HOD from the staff roster list for HOD / Super Admin
      if (hodStaffId) {
        staffWhere.id = { [Op.ne]: hodStaffId };
      }
    }

    const staffMembers = await models.Staff.findAll({
      where: staffWhere,
      attributes: ['id', 'name', 'email', 'employee_id', 'designation'],
      order: [['name', 'ASC']]
    });

    // 4. Fetch assigned job rosters for this date and department
    const rosterEntries = await models.JobRoster.findAll({
      where: {
        tenant_id: tenantId,
        department_id: deptId,
        date: date
      },
      include: [
        { model: models.User, as: 'AssignedByUser', attributes: ['id', 'name', 'username'] }
      ]
    });

    // Create lookup map by staff_id
    const rosterMap = {};
    rosterEntries.forEach((r) => {
      rosterMap[r.staff_id] = r;
    });

    // 5. Combine staff with their daily assigned duties
    let assignedCount = 0;
    let completedCount = 0;
    let incompleteCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;

    const rosterList = staffMembers.map((st) => {
      const assigned = rosterMap[st.id] || null;
      if (assigned) {
        assignedCount++;
        const s = (assigned.status || '').toLowerCase();
        if (s === 'completed' || s === 'complete') {
          completedCount++;
        } else if (s === 'incomplete') {
          incompleteCount++;
        } else if (s === 'in_progress') {
          inProgressCount++;
        } else {
          pendingCount++;
        }
      }

      return {
        staffId: st.id,
        name: st.name,
        email: st.email,
        employeeId: st.employee_id,
        designation: st.designation,
        hasTaskAssigned: !!assigned,
        jobRosterId: assigned ? assigned.id : null,
        taskTitle: assigned ? assigned.task_title : null,
        taskDescription: assigned ? assigned.task_description : null,
        shift: assigned ? assigned.shift : 'Full Day (09:00 - 17:00)',
        priority: assigned ? assigned.priority : 'medium',
        status: assigned ? assigned.status : 'unassigned',
        completionNotes: assigned ? assigned.completion_notes : null,
        assignedBy: assigned?.AssignedByUser ? assigned.AssignedByUser.name : null,
        updatedAt: assigned ? (assigned.updatedAt || assigned.updated_at) : null
      };
    });

    return successResponse(res, {
      date,
      department: {
        id: department.id,
        code: department.code,
        name: department.name
      },
      hod: hodAssignment?.Staff ? {
        id: hodAssignment.Staff.id,
        name: hodAssignment.Staff.name,
        email: hodAssignment.Staff.email,
        designation: hodAssignment.Staff.designation
      } : null,
      summary: {
        totalStaff: staffMembers.length,
        assignedCount,
        unassignedCount: staffMembers.length - assignedCount,
        completedCount,
        incompleteCount,
        inProgressCount,
        pendingCount,
        coveragePercentage: staffMembers.length > 0 ? Math.round((assignedCount / staffMembers.length) * 100) : 0
      },
      roster: rosterList
    });
  } catch (err) {
    console.error('[Get Job Roster Error]', err);
    return errorResponse(res, 'Failed to retrieve job roster', 500);
  }
};

/**
 * 2. POST /departments/job-roster/assign
 * HOD assigns or updates daily duty for a staff member of their department
 */
exports.assignTask = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentUser = req.user;

    // Permissions check: HOD or Super Admin
    if (!['HOD', 'Super Admin', 'Admin'].includes(currentUser.role)) {
      return errorResponse(res, 'Access denied. Only HOD and Super Admin can assign daily staff duties.', 403);
    }

    const schema = Joi.object({
      staffId: Joi.string().uuid().required(),
      taskTitle: Joi.string().required(),
      taskDescription: Joi.string().optional().allow('', null),
      date: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      departmentId: Joi.string().uuid().optional(),
      shift: Joi.string().optional().default('Full Day (09:00 - 17:00)'),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional().default('medium'),
      status: Joi.string().valid('assigned', 'pending', 'incomplete', 'in_progress', 'complete', 'completed').optional().default('pending')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    const date = value.date || new Date().toISOString().split('T')[0];

    // Find staff member
    const staff = await models.Staff.findOne({
      where: { id: value.staffId, tenant_id: tenantId }
    });

    if (!staff) {
      return errorResponse(res, 'Staff member not found in tenant.', 404);
    }

    const deptId = staff.department_id;

    // If currentUser is HOD, verify this staff belongs to the HOD's department and is NOT the HOD!
    if (currentUser.role === 'HOD') {
      const hodDeptId = await resolveTargetDepartment(req, tenantId);
      if (hodDeptId && hodDeptId !== deptId) {
        return errorResponse(res, 'Unauthorized: HOD can only assign tasks to staff within their own department.', 403);
      }
      const hodAssignment = await models.HODAssignment.findOne({
        where: { department_id: deptId, tenant_id: tenantId, is_active: true }
      });
      if (hodAssignment && hodAssignment.staff_id === value.staffId) {
        return errorResponse(res, 'The HOD cannot assign duties to themselves. Daily duties are for departmental faculty members.', 400);
      }
    }

    // Check if task already exists for this staff on this date
    let existingRoster = await models.JobRoster.findOne({
      where: {
        tenant_id: tenantId,
        department_id: deptId,
        staff_id: value.staffId,
        date: date
      }
    });

    if (existingRoster) {
      existingRoster.task_title = value.taskTitle;
      existingRoster.task_description = value.taskDescription || null;
      existingRoster.shift = value.shift;
      existingRoster.priority = value.priority;
      existingRoster.status = value.status;
      existingRoster.assigned_by_user_id = currentUser.userId || currentUser.id;
      existingRoster.updated_at = new Date();
      await existingRoster.save();

      return successResponse(res, existingRoster, `Daily task updated for ${staff.name} on ${date}.`);
    } else {
      const newRoster = await models.JobRoster.create({
        tenant_id: tenantId,
        department_id: deptId,
        staff_id: value.staffId,
        assigned_by_user_id: currentUser.userId || currentUser.id,
        date: date,
        task_title: value.taskTitle,
        task_description: value.taskDescription || null,
        shift: value.shift,
        priority: value.priority,
        status: value.status
      });

      return successResponse(res, newRoster, `Task successfully assigned to ${staff.name} for ${date}.`, 201);
    }
  } catch (err) {
    console.error('[Assign Task Error]', err);
    return errorResponse(res, 'Failed to assign daily task: ' + err.message, 500);
  }
};

/**
 * 3. POST /departments/job-roster/bulk-assign
 * HOD assigns tasks for all or multiple staff of their department in one submission
 */
exports.bulkAssignTasks = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentUser = req.user;

    if (!['HOD', 'Super Admin', 'Admin'].includes(currentUser.role)) {
      return errorResponse(res, 'Access denied. Only HOD and Super Admin can assign staff duties.', 403);
    }

    const { date, departmentId, tasks } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return errorResponse(res, 'Tasks array is required and must not be empty.', 400);
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const deptId = departmentId || await resolveTargetDepartment(req, tenantId);

    const hodAssignment = await models.HODAssignment.findOne({
      where: { department_id: deptId, tenant_id: tenantId, is_active: true }
    });
    const hodStaffId = hodAssignment?.staff_id;

    let assignedCount = 0;
    for (const item of tasks) {
      if (!item.staffId || !item.taskTitle) continue;
      if (hodStaffId && item.staffId === hodStaffId) continue;

      let existing = await models.JobRoster.findOne({
        where: {
          tenant_id: tenantId,
          department_id: deptId,
          staff_id: item.staffId,
          date: targetDate
        }
      });

      if (existing) {
        existing.task_title = item.taskTitle;
        existing.task_description = item.taskDescription || existing.task_description;
        existing.shift = item.shift || existing.shift;
        existing.priority = item.priority || existing.priority;
        existing.assigned_by_user_id = currentUser.userId || currentUser.id;
        existing.updated_at = new Date();
        await existing.save();
      } else {
        await models.JobRoster.create({
          tenant_id: tenantId,
          department_id: deptId,
          staff_id: item.staffId,
          assigned_by_user_id: currentUser.userId || currentUser.id,
          date: targetDate,
          task_title: item.taskTitle,
          task_description: item.taskDescription || null,
          shift: item.shift || 'Full Day (09:00 - 17:00)',
          priority: item.priority || 'medium',
          status: 'pending'
        });
      }
      assignedCount++;
    }

    return successResponse(res, { count: assignedCount, date: targetDate }, `Successfully rostered ${assignedCount} staff tasks for ${targetDate}.`);
  } catch (err) {
    console.error('[Bulk Assign Tasks Error]', err);
    return errorResponse(res, 'Failed to bulk assign tasks: ' + err.message, 500);
  }
};

/**
 * 4. PATCH /departments/job-roster/:id/status
 * Staff updates their own duty status, or HOD updates task status
 */
exports.updateTaskStatus = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentUser = req.user;
    const { id } = req.params;
    const { status, completionNotes } = req.body;

    const roster = await models.JobRoster.findOne({
      where: { id: id, tenant_id: tenantId }
    });

    if (!roster) {
      return errorResponse(res, 'Job roster task not found.', 404);
    }

    // If role is Staff, verify staff only updates their own task!
    if (currentUser.role === 'Staff') {
      let currentStaffId = currentUser.staffId;
      if (!currentStaffId && currentUser.email) {
        const staffRec = await models.Staff.findOne({
          where: { tenant_id: tenantId, email: currentUser.email }
        });
        if (staffRec) currentStaffId = staffRec.id;
      }
      if (currentStaffId && roster.staff_id !== currentStaffId) {
        return errorResponse(res, 'Unauthorized: Staff members can only update their own assigned tasks.', 403);
      }
    }

    if (status) {
      roster.status = status.toLowerCase();
    }
    if (completionNotes !== undefined) {
      roster.completion_notes = completionNotes;
    }
    roster.updated_at = new Date();
    await roster.save();

    return successResponse(res, roster, `Duty status updated to '${roster.status}' with submission note.`);
  } catch (err) {
    console.error('[Update Task Status Error]', err);
    return errorResponse(res, 'Failed to update task status: ' + err.message, 500);
  }
};

/**
 * 5. DELETE /departments/job-roster/:id
 * HOD or Admin removes a task from the roster
 */
exports.deleteTask = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentUser = req.user;
    const { id } = req.params;

    if (!['HOD', 'Super Admin', 'Admin'].includes(currentUser.role)) {
      return errorResponse(res, 'Access denied. Only HOD and Super Admin can remove roster tasks.', 403);
    }

    const roster = await models.JobRoster.findOne({
      where: { id: id, tenant_id: tenantId }
    });

    if (!roster) {
      return errorResponse(res, 'Job roster task not found.', 404);
    }

    await roster.destroy();
    return successResponse(res, null, 'Task removed from roster successfully.');
  } catch (err) {
    console.error('[Delete Task Error]', err);
    return errorResponse(res, 'Failed to delete task: ' + err.message, 500);
  }
};
