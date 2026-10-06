import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Role-aware route guard placeholder
export const RoleGuard = ({ allowedRoles = [], children }) => {
  const { user, role, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="pmart-loader-container">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Determine a safe fallback based on the actual user role
    switch (role) {
      case 'ADMIN':
        return <Navigate to="/admin" replace />;
      case 'RIDER':
        return <Navigate to="/rider" replace />;
      case 'SHOP_OWNER':
        return <Navigate to="/shop" replace />;
      case 'CUSTOMER':
      default:
        return <Navigate to="/" replace />;
    }
  }

  // Mandatory password change for new riders
  if (role === 'RIDER') {
    if (user.mustChangePassword && location.pathname !== '/rider/mandatory-password-change') {
      return <Navigate to="/rider/mandatory-password-change" replace />;
    }
    if (!user.mustChangePassword && location.pathname === '/rider/mandatory-password-change') {
      return <Navigate to="/rider" replace />;
    }
  }

  // Ensure profile is complete for protected routes.
  // Only CUSTOMER and RIDER go through profile-completion onboarding.
  // ADMIN and EMPLOYEE are staff accounts that skip this flow entirely.
  const requiresOnboarding = role === 'CUSTOMER' || role === 'RIDER';
  if (requiresOnboarding && !user.profileComplete) {
    if (role === 'RIDER' && location.pathname !== '/rider/onboarding') {
      return <Navigate to="/rider/onboarding" replace />;
    } else if (role === 'CUSTOMER' && location.pathname !== '/register') {
      return <Navigate to="/register" replace />;
    }
  }

  // Prevent onboarded users from accessing onboarding pages
  if (user.profileComplete) {
    if (role === 'RIDER' && location.pathname === '/rider/onboarding') {
      return <Navigate to="/rider" replace />;
    } else if (role === 'CUSTOMER' && location.pathname === '/register') {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};
