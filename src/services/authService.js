import apiClient from './apiClient';
import { mockUsers } from '../data/mockUsers';

export const authService = {
  // Step 1: Send OTP to mobile or email
  async sendOtp(identifier) {
    try {
      // Future backend API call:
      // const response = await apiClient.post('/auth/send-otp', { identifier });
      // return response.data;
      
      // Visual mock response:
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: `OTP sent successfully to ${identifier}`,
            // In demo mode, OTP 1234 or 4829 always works
            demoOtp: '1234'
          });
        }, 600);
      });
    } catch (error) {
      throw error;
    }
  },

  // Step 2: Verify OTP
  async verifyOtp(identifier, otp, requestedRole = null) {
    try {
      // Future backend API call:
      // const response = await apiClient.post('/auth/verify-otp', { identifier, otp });
      // return response.data;

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (otp === '0000' || otp === '9999') {
            reject(new Error('Invalid or expired OTP. Please try again.'));
            return;
          }

          // Role determination: In production the backend determines user role.
          // For frontend evaluation, if requestedRole is provided or based on email/phone, map to mock user.
          let resolvedRole = requestedRole || 'customer';
          if (identifier.toLowerCase().includes('shop') || identifier.includes('98102')) {
            resolvedRole = 'shop_owner';
          } else if (identifier.toLowerCase().includes('rider') || identifier.includes('98112')) {
            resolvedRole = 'rider';
          } else if (identifier.toLowerCase().includes('admin') || identifier.includes('98100')) {
            resolvedRole = 'admin';
          }

          const userProfile = mockUsers[
            resolvedRole === 'shop_owner' ? 'shopOwner' : resolvedRole
          ] || mockUsers.customer;

          const authPayload = {
            token: 'mock_jwt_token_' + Date.now(),
            user: { ...userProfile, role: resolvedRole }
          };

          localStorage.setItem('pmart_auth_token', authPayload.token);
          localStorage.setItem('pmart_user', JSON.stringify(authPayload.user));

          resolve({
            success: true,
            data: authPayload
          });
        }, 700);
      });
    } catch (error) {
      throw error;
    }
  },

  // Step 3: Get active authenticated user
  async getCurrentUser() {
    const cached = localStorage.getItem('pmart_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return mockUsers.customer;
      }
    }
    return mockUsers.customer;
  },

  // Step 4: Logout
  async logout() {
    localStorage.removeItem('pmart_auth_token');
    localStorage.removeItem('pmart_user');
    return { success: true };
  }
};
