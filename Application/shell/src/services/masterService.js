import api from './api';

export const masterService = {
  getYears: async () => api.get('/master/years'),
  getYearById: async (id) => api.get(`/master/years/${id}`),
  getYearSubjects: async (id) => api.get(`/master/years/${id}/subjects`),
  createYear: async (data) => api.post('/master/years', data),
  updateYear: async (id, data) => api.put(`/master/years/${id}`, data),
  deleteYear: async (id) => api.delete(`/master/years/${id}`),

  getSubjects: async (params = {}) => api.get('/master/subjects', { params }),
  createSubject: async (data) => api.post('/master/subjects', data),
  updateSubject: async (id, data) => api.put(`/master/subjects/${id}`, data),
  deleteSubject: async (id) => api.delete(`/master/subjects/${id}`),

  searchStaff: async (params = {}) => api.get('/master/staff/search', { params }),
  getStaffById: async (id) => api.get(`/master/staff/${id}`),
  getStaffAssignments: async (id) => api.get(`/master/staff/${id}/assignments`),
  createStaffAssignment: async (data) => api.post('/master/staff/assignments', data),
  updateStaffAssignment: async (id, data) => api.put(`/master/staff/assignments/${id}`, data),
  deleteStaffAssignment: async (id) => api.delete(`/master/staff/assignments/${id}`),

  searchDepartments: async (params = {}) => api.get('/master/departments/search', { params }),
  getDepartmentById: async (id) => api.get(`/master/departments/${id}`),
  getDepartmentStaff: async (id) => api.get(`/master/departments/${id}/staff`),
  getDepartmentStudentCounts: async (id) => api.get(`/master/departments/${id}/student-counts`),
  createDepartment: async (data) => api.post('/master/departments', data),
  assignHOD: async (departmentId, staffId) => api.post(`/master/departments/${departmentId}/assign-hod`, { staffId }),

  createStaff: async (data) => api.post('/master/staff', data),

  // Timetable Class Schedule in Year Master
  getClassSchedule: async (params = {}) => api.get('/master/schedule', { params })
};
