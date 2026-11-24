import api from './api';

export const departmentService = {
  studentSubjectLookup: async (params = {}) => api.get('/departments/student-subject-lookup', { params }),
  getHODStaffOverview: async (hodStaffId = null) => {
    const params = hodStaffId ? { hodStaffId } : {};
    return api.get('/departments/hod/me/staff', { params });
  },
  getHODList: async () => api.get('/departments/hod/list'),
  getJobRoster: async (params = {}) => api.get('/departments/job-roster', { params }),
  assignTask: async (payload) => api.post('/departments/job-roster/assign', payload),
  bulkAssignTasks: async (payload) => api.post('/departments/job-roster/bulk-assign', payload),
  updateTaskStatus: async (id, payload) => api.patch(`/departments/job-roster/${id}/status`, payload),
  deleteTask: async (id) => api.delete(`/departments/job-roster/${id}`),

  // Timetable & Schedule Builder (HOD)
  getScheduleMeta: async (params = {}) => api.get('/departments/schedule/meta', { params }),
  getClassSchedule: async (params = {}) => api.get('/departments/schedule', { params }),
  publishClassSchedule: async (payload) => api.post('/departments/schedule/publish', payload),
  deleteClassSchedule: async (payload) => api.delete('/departments/schedule', { data: payload })
};
