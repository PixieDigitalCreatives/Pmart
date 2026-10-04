import apiClient from './apiClient';
import { PAYMENT_STATUS } from '../types/orderTypes';

export const paymentService = {
  /**
   * Fetch current payment status for an order
   */
  async getPaymentStatus(orderId) {
    const response = await apiClient.get(`/orders/${orderId}`);
    const order = response.data;
    
    return {
      orderId: order._id,
      paymentMethod: order.paymentMethod || 'COD',
      paymentStatus: order.paymentStatus || PAYMENT_STATUS.PENDING,
      amount: order.totalAmount || 0,
      currency: 'INR'
    };
  },

  /**
   * Mark cash payment collected by the rider upon reaching customer.
   * CRITICAL: Does NOT mark delivery as complete!
   */
  async markPaymentCollected(orderId) {
    const response = await apiClient.put(`/orders/${orderId}/payment-status`, { paymentStatus: PAYMENT_STATUS.COLLECTED });
    const updated = response.data?.data || response.data;

    return {
      success: true,
      order: updated,
      message: 'Cash payment marked as COLLECTED successfully.'
    };
  }
};
