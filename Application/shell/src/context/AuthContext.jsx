import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('college_erp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [tenant, setTenant] = useState(() => {
    const saved = localStorage.getItem('college_erp_tenant');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('college_erp_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const res = await authService.getMe();
          setUser(res.data.user);
          setTenant(res.data.tenant);
          localStorage.setItem('college_erp_user', JSON.stringify(res.data.user));
          localStorage.setItem('college_erp_tenant', JSON.stringify(res.data.tenant));
        } catch (err) {
          console.error('Session expired:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  const login = async (usernameOrEmail, password, tenantCode, extraParams = {}) => {
    const res = await authService.login(usernameOrEmail, password, tenantCode, extraParams);
    const { token: newToken, user: newUser, tenant: newTenant } = res.data;

    localStorage.setItem('college_erp_token', newToken);
    localStorage.setItem('college_erp_user', JSON.stringify(newUser));
    localStorage.setItem('college_erp_tenant', JSON.stringify(newTenant));

    setToken(newToken);
    setUser(newUser);
    setTenant(newTenant);
    return res.data;
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider value={{ user, tenant, token, login, logout, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
