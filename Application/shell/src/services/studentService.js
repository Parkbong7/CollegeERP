import api from './api';

export const studentService = {
  searchStudents: async (params = {}) => api.get('/students/search', { params }),
  getStudentById: async (id) => api.get(`/students/${id}`),
  getStudentSubjects: async (id) => api.get(`/students/${id}/subjects`),
  createStudent: async (data) => api.post('/students', data),
  updateStudent: async (id, data) => api.put(`/students/${id}`, data),
  deleteStudent: async (id) => api.delete(`/students/${id}`)
};
