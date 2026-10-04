import apiClient from './apiClient';

export const authService = {
  /**
   * Register a new customer.
   */
  async register(phone, password, name) {
    const response = await apiClient.post('/auth/register', { phone, password, name });
    
    const authPayload = {
      token: response.data.accessToken,
      user: response.data.user,
      profileComplete: response.data.profileComplete,
    };

    localStorage.setItem('pmart_auth_token', authPayload.token);
    localStorage.setItem('pmart_user', JSON.stringify(authPayload.user));

    return {
      success: true,
      data: authPayload,
    };
  },

  /**
   * Login with phone and password.
   */
  async login(phone, password) {
    const response = await apiClient.post('/auth/login', { phone, password });
    
    const authPayload = {
      token: response.data.accessToken,
      user: response.data.user,
      profileComplete: response.data.profileComplete,
    };

    localStorage.setItem('pmart_auth_token', authPayload.token);
    localStorage.setItem('pmart_user', JSON.stringify(authPayload.user));

    return {
      success: true,
      data: authPayload,
    };
  },

  /**
   * Login with Google (using Firebase ID Token).
   */
  async googleLogin(idToken) {
    const response = await apiClient.post('/auth/google', { idToken });
    
    const authPayload = {
      token: response.data.accessToken,
      user: response.data.user,
      profileComplete: response.data.profileComplete,
    };

    localStorage.setItem('pmart_auth_token', authPayload.token);
    localStorage.setItem('pmart_user', JSON.stringify(authPayload.user));

    return {
      success: true,
      data: authPayload,
    };
  },

  /**
   * Complete user profile with phone and password after Google login.
   */
  async completeProfile(data) {
    const response = await apiClient.post('/auth/complete-profile', data);
    
    const user = response.data.user;
    localStorage.setItem('pmart_user', JSON.stringify(user));

    return {
      success: true,
      user,
    };
  },

  /**
   * Get current user profile.
   */
  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Logout user.
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      localStorage.removeItem('pmart_auth_token');
      localStorage.removeItem('pmart_user');
    }
  }
};
