import apiClient, { setAccessToken } from './apiClient';

const USER_KEY = 'pmart_user';

const storeSession = (data) => {
  setAccessToken(data.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
};

export const authService = {
  async register(name, phone, password) {
    const res = await apiClient.post('/auth/register', { name, phone, password });
    return storeSession(res.data);
  },

  async login(phone, password) {
    const res = await apiClient.post('/auth/login', { phone, password });
    return storeSession(res.data);
  },

  async googleLogin(idToken) {
    const res = await apiClient.post('/auth/google', { idToken });
    return storeSession(res.data);
  },

  async completeProfile(data) {
    const res = await apiClient.post('/auth/complete-profile', data);
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    return res.data.user;
  },

  async activateAccount(token, password, confirmPassword) {
    const res = await apiClient.post('/auth/activate', { token, password, confirmPassword });
    return res.data;
  },

  async me() {
    const res = await apiClient.get('/auth/me');
    return res.data.user;
  },

  async changePassword(currentPassword, newPassword, confirmPassword) {
    const res = await apiClient.put('/auth/password', { currentPassword, newPassword, confirmPassword });
    return storeSession(res.data);
  },

  async updateProfile(data) {
    const res = await apiClient.put('/users/profile', data);
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.data));
    return res.data.data;
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // The local session is cleared regardless.
    } finally {
      setAccessToken(null);
      localStorage.removeItem(USER_KEY);
    }
  },

  clearLocalSession() {
    setAccessToken(null);
    localStorage.removeItem(USER_KEY);
  },

  /** Last profile saved at sign-in, used only while the server cannot be reached. */
  getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }
};
