import api from './api';

export const attendanceService = {
  markAttendance: async (data) => api.post('/attendance/mark', data),
  getAttendanceSheet: async (params = {}) => api.get('/attendance/sheet', { params }),
  getMyAttendance: async () => api.get('/attendance/my-attendance'),
  getStudentAttendance: async (studentId) => api.get(`/attendance/student/${studentId}`),
  getAttendanceSummary: async (params = {}) => api.get('/attendance/summary', { params })
};
