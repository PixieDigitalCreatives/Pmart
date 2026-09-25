import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Role-aware route guard placeholder
export const RoleGuard = ({ allowedRoles = [], children }) => {
  const { user, role, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user role is not explicitly allowed, route placeholder can allow or direct
  // In demo prototype mode, we allow seamless browsing, but warn or switch if needed
  return children;
};
