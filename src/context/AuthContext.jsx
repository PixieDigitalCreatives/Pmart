import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import apiClient from '../services/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiClient.get('/auth/me');
        if (response.data && response.data.user) {
          const u = response.data.user;
          setUser(u);
          setRole(u.role || 'CUSTOMER');
          setIsAuthenticated(true);
        }
      } catch (error) {
        setUser(null);
        setRole(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  /**
   * Login with phone and password.
   */
  const login = async (phone, password) => {
    try {
      const response = await authService.login(phone, password);
      if (response.success) {
        setUser(response.data.user);
        setRole(response.data.user.role);
        setIsAuthenticated(true);
        return {
          success: true,
          user: response.data.user,
          profileComplete: response.data.profileComplete,
        };
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Register with phone, password, and name.
   */
  const register = async (phone, password, name) => {
    try {
      const response = await authService.register(phone, password, name);
      if (response.success) {
        setUser(response.data.user);
        setRole(response.data.user.role);
        setIsAuthenticated(true);
        return { success: true, user: response.data.user };
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Login with Google.
   */
  const googleLogin = async (idToken) => {
    try {
      const response = await authService.googleLogin(idToken);
      if (response.success) {
        setUser(response.data.user);
        setRole(response.data.user.role);
        setIsAuthenticated(true);
        return {
          success: true,
          user: response.data.user,
          profileComplete: response.data.profileComplete,
        };
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Complete rider profile after Admin provision + Google login.
   */
  const completeRiderProfile = async (data) => {
    try {
      const response = await apiClient.put('/rider/profile', data);
      if (response.data.success) {
        const updatedUser = { ...user, profileComplete: true, ...response.data.rider };
        setUser(updatedUser);
        return { success: true, user: updatedUser };
      }
    } catch (error) {
      throw error;
    }
  };

  const completeProfile = async (data) => {
    try {
      const response = await authService.completeProfile(data);
      if (response.success) {
        setUser(response.user);
        return { success: true, user: response.user };
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        loading,
        login, register, googleLogin,
        completeProfile,
        completeRiderProfile,
        logout,
      }}
    >
      {!loading && children}
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
