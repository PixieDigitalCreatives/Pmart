import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { getAccessToken } from '../services/apiClient';

const AuthContext = createContext(null);

/** Landing page for each role after sign-in. */
export const homeForRole = (role) => {
  switch (role) {
    case 'ADMIN':
    case 'EMPLOYEE':
      return '/admin';
    case 'SHOP_OWNER':
      return '/shop';
    case 'RIDER':
      return '/rider';
    default:
      return '/';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((u) => setUser(u || null), []);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await authService.me();
        if (!cancelled) applyUser(me);
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          authService.clearLocalSession();
          applyUser(null);
        } else {
          // Server unreachable or failing: stay signed in with the last known profile; API calls will
          // re-validate the session once the server is back.
          applyUser(authService.getStoredUser());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    restore();

    const onExpired = () => applyUser(null);
    window.addEventListener('pmart:session-expired', onExpired);
    return () => {
      cancelled = true;
      window.removeEventListener('pmart:session-expired', onExpired);
    };
  }, [applyUser]);

  const login = async (phone, password) => {
    const data = await authService.login(phone, password);
    applyUser(data.user);
    return data.user;
  };

  const register = async (name, phone, password) => {
    const data = await authService.register(name, phone, password);
    applyUser(data.user);
    return data.user;
  };

  const googleLogin = async (idToken) => {
    const data = await authService.googleLogin(idToken);
    applyUser(data.user);
    return data.user;
  };

  const completeProfile = async (payload) => {
    const updated = await authService.completeProfile(payload);
    applyUser(updated);
    return updated;
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    const data = await authService.changePassword(currentPassword, newPassword, confirmPassword);
    applyUser(data.user);
    return data.user;
  };

  const updateProfile = async (payload) => {
    const updated = await authService.updateProfile(payload);
    applyUser(updated);
    return updated;
  };

  const logout = async () => {
    await authService.logout();
    applyUser(null);
  };

  /** ADMIN has every permission; EMPLOYEE only those granted. */
  const can = useCallback(
    (permission) => {
      if (!user) return false;
      if (user.role === 'ADMIN') return true;
      return user.role === 'EMPLOYEE' && Array.isArray(user.permissions) && user.permissions.includes(permission);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: Boolean(user),
        loading,
        login,
        register,
        googleLogin,
        completeProfile,
        changePassword,
        updateProfile,
        logout,
        can
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
