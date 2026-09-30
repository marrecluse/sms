// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('sms_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sms_token');
    if (!token) { setLoading(false); return; }

    authAPI.me()
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem('sms_user', JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem('sms_token');
        localStorage.removeItem('sms_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('sms_token', data.token);
    localStorage.setItem('sms_user',  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    authAPI.logout().catch(() => {});
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setUser(null);
  }, []);

  // Call this after profile update/avatar upload to keep sidebar in sync
  const refreshUser = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('sms_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading, refreshUser,
      isAdmin:   user?.role === 'admin',
      isTeacher: user?.role === 'teacher',
      isStudent: user?.role === 'student',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};