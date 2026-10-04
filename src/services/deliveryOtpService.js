import apiClient from './apiClient';

// In-memory cooldown tracker for resend requests
const resendTimestamps = new Map(); // orderId -> timestamp
const COOLDOWN_SECONDS = 30;

export const deliveryOtpService = {
  /**
   * Dispatches delivery OTP notification to customer (SMS/WhatsApp simulation)
   */
  async sendDeliveryOtp(orderId) {
    // In a real system, you would call backend to generate/send OTP via SMS
    // For now, it's just a mock that the UI calls.
    return {
      success: true,
      message: `Delivery OTP sent securely to customer.`,
      channel: 'SMS/WhatsApp'
    };
  },

  /**
   * Get remaining cooldown seconds for resend
   */
  async getResendCooldown(orderId) {
    const lastSent = resendTimestamps.get(orderId) || 0;
    const elapsedSeconds = Math.floor((Date.now() - lastSent) / 1000);
    const remaining = Math.max(0, COOLDOWN_SECONDS - elapsedSeconds);
    return remaining;
  },

  /**
   * Resend delivery OTP to customer with cooldown protection
   */
  async resendDeliveryOtp(orderId) {
    const remaining = await this.getResendCooldown(orderId);
    if (remaining > 0) {
      throw new Error(`Please wait ${remaining}s before requesting a new OTP.`);
    }

    try {
      const response = await apiClient.post(`/orders/${orderId}/resend-otp`);
      resendTimestamps.set(orderId, Date.now());
      
      return {
        success: true,
        message: response.data.message || 'New Delivery OTP sent successfully.',
        cooldownSeconds: COOLDOWN_SECONDS
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to resend OTP');
    }
  },

  /**
   * Verify entered customer OTP.
   */
  async verifyDeliveryOtp(orderId, otp) {
    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp) {
      throw new Error('Please enter a complete Delivery OTP.');
    }

    try {
      const response = await apiClient.post(`/orders/${orderId}/verify-otp`, { otp: cleanOtp });
      
      return {
        success: true,
        order: response.data?.data || response.data,
        message: response.data?.message || response.message || 'Delivery OTP Verified successfully.'
      };
    } catch (error) {
      console.error('[OTP VERIFY ERROR]', error.response?.status, error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'OTP verification failed');
    }
  }
};
