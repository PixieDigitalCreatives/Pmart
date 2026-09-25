import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { mockUsers } from '../data/mockUsers';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(mockUsers.customer);
  const [role, setRole] = useState('customer'); // 'customer' | 'shop_owner' | 'rider' | 'admin'
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check initial auth state from localStorage or default to customer demo
    const storedUser = localStorage.getItem('pmart_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setRole(parsed.role || 'customer');
      } catch (e) {
        setUser(mockUsers.customer);
      }
    }
  }, []);

  const loginWithOtp = async (identifier, otp, requestedRole) => {
    setLoading(true);
    try {
      const response = await authService.verifyOtp(identifier, otp, requestedRole);
      if (response.success) {
        setUser(response.data.user);
        setRole(response.data.user.role);
        setIsAuthenticated(true);
        return { success: true, user: response.data.user };
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setRole('customer');
  };

  // Seamless demo role switch for frontend inspection
  const switchRole = (newRole) => {
    let selectedUser;
    switch (newRole) {
      case 'shop_owner':
        selectedUser = mockUsers.shopOwner;
        break;
      case 'rider':
        selectedUser = mockUsers.rider;
        break;
      case 'admin':
        selectedUser = mockUsers.admin;
        break;
      case 'customer':
      default:
        selectedUser = mockUsers.customer;
        break;
    }
    setUser(selectedUser);
    setRole(newRole);
    setIsAuthenticated(true);
    localStorage.setItem('pmart_user', JSON.stringify(selectedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        loading,
        loginWithOtp,
        logout,
        switchRole
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
