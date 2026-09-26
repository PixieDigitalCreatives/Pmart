import { orderService } from './orderService';
import { DELIVERY_VERIFICATION_STATUS } from '../types/orderTypes';

// In-memory cooldown tracker for resend requests
const resendTimestamps = new Map(); // orderId -> timestamp
const COOLDOWN_SECONDS = 30;

export const deliveryOtpService = {
  /**
   * Dispatches delivery OTP notification to customer (SMS/WhatsApp simulation)
   */
  async sendDeliveryOtp(orderId) {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    return {
      success: true,
      message: `Delivery OTP sent securely to customer at ${order.customer?.phone || 'registered mobile'}.`,
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

    resendTimestamps.set(orderId, Date.now());
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    // In a real backend, a new OTP would be generated and sent via SMS.
    // For local mock testing, keep the expected OTP or renewal
    return {
      success: true,
      message: 'New Delivery OTP sent successfully to customer via SMS.',
      cooldownSeconds: COOLDOWN_SECONDS
    };
  },

  /**
   * Verify entered customer OTP.
   * Do NOT expose the actual OTP value in the rider UI.
   */
  async verifyDeliveryOtp(orderId, otp) {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    // Simulate backend network latency
    await new Promise(r => setTimeout(r, 600));

    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp || cleanOtp.length !== 4) {
      throw new Error('Please enter a complete 4-digit Delivery OTP.');
    }

    // Special test code for expired OTP simulation
    if (cleanOtp === '9999') {
      throw new Error('OTP expired. Request a new OTP.');
    }

    const expected = String(order.deliveryOtp || '5821');

    // Strict OTP verification check
    if (cleanOtp !== expected) {
      throw new Error('Incorrect OTP. Please try again.');
    }

    // Success: mark deliveryVerificationStatus = OTP_VERIFIED and orderStatus = DELIVERED
    const updated = await orderService.updateOrderData(orderId, {
      deliveryVerificationStatus: DELIVERY_VERIFICATION_STATUS.OTP_VERIFIED,
      orderStatus: 'DELIVERED',
      status: 'delivered',
      paymentStatus: 'COLLECTED'
    });

    return {
      success: true,
      order: updated,
      message: 'Delivery OTP Verified successfully.'
    };
  }
};
