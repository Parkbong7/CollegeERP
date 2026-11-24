import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('college_erp_token');
    // If not in localStorage yet, check URL query parameters (passed from host Shell)
    if (!token && typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        if (urlToken) {
          token = urlToken;
          localStorage.setItem('college_erp_token', urlToken);
          const urlUser = params.get('user');
          if (urlUser) localStorage.setItem('college_erp_user', urlUser);
        }
      } catch (e) {}
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only redirect top-level window, never redirect an embedded micro-frontend iframe
      if (typeof window !== 'undefined' && window.self === window.top) {
        localStorage.removeItem('college_erp_token');
        localStorage.removeItem('college_erp_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    const message = error.response?.data?.error?.message || error.message || 'Server request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;
