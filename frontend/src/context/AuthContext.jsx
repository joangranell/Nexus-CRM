import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nexus_user') || localStorage.getItem('bfg_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('nexus_token') || localStorage.getItem('bfg_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('nexus_token') || localStorage.getItem('bfg_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.data);
          localStorage.setItem('nexus_user', JSON.stringify(res.data));
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    const { access_token, user: loggedUser } = res.data;
    localStorage.setItem('nexus_token', access_token);
    localStorage.setItem('nexus_user', JSON.stringify(loggedUser));
    setToken(access_token);
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('bfg_token');
    localStorage.removeItem('bfg_user');
    setToken(null);
    setUser(null);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdminMarketing = user?.role === 'ADMIN_MARKETING';
  const isAdmin = isSuperAdmin || isAdminMarketing;
  const isComercial = user?.role === 'COMERCIAL';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isSuperAdmin,
        isAdminMarketing,
        isAdmin,
        isComercial,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
