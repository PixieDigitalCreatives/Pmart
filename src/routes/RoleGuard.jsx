import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, homeForRole } from '@/context/AuthContext';

/**
 * Restricts a route to the given roles and (for staff) an optional permission; an array means any one of them.
 * Also routes users through mandatory steps: initial password change and Google sign-up completion.
 */
export const RoleGuard = ({ allowedRoles = [], permission, children }) => {
  const { user, role, isAuthenticated, loading, can } = useAuth();
  const location = useLocation();

  if (loading) return <div className="pmart-loader-container">Loading...</div>;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.mustChangePassword && location.pathname !== '/account/change-password') {
    return <Navigate to="/account/change-password" replace />;
  }

  if (role === 'CUSTOMER' && !user.profileComplete && location.pathname !== '/register') {
    return <Navigate to="/register" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  const permitted = Array.isArray(permission) ? permission.some(can) : can(permission);
  if (permission && (role === 'ADMIN' || role === 'EMPLOYEE') && !permitted) {
    return <Navigate to="/admin" replace state={{ denied: permission }} />;
  }

  return children;
};
