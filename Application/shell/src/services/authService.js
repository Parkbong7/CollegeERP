import api from './api';

export const authService = {
  login: async (usernameOrEmail, password, tenantCode, extraParams = {}) => {
    return await api.post('/auth/login', { usernameOrEmail, password, tenantCode, ...extraParams });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('college_erp_token');
      localStorage.removeItem('college_erp_user');
      localStorage.removeItem('college_erp_tenant');
    }
  },

  getMe: async () => {
    return await api.get('/auth/me');
  },

  getTenantCurrent: async () => {
    return await api.get('/tenant/current');
  },

  getTenantSummary: async () => {
    return await api.get('/tenant/summary');
  }
};
