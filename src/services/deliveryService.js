import apiClient from './apiClient';
import { ORDER_STATUS, PAYMENT_STATUS, DELIVERY_VERIFICATION_STATUS } from '../types/orderTypes';
import { orderService } from './orderService';

export const deliveryService = {
  /**
   * Rider marks that they have reached the customer doorstep.
   * Order status transitions to ARRIVED.
   */
  async arriveAtCustomer(orderId) {
    try {
      const response = await apiClient.put(`/orders/${orderId}/status`, { status: ORDER_STATUS.ARRIVED });
      return response.data?.data || response.data;
    } catch (e) {
      console.error('[ARRIVE ERROR]', e.response?.data);
      throw e;
    }
  },

  /**
   * Completes the delivery after verifying all prerequisite conditions:
   * 1. Status is ARRIVED
   * 2. Payment is COLLECTED
   * 3. Delivery OTP is OTP_VERIFIED
   */
  async completeDelivery(orderId) {
    const response = await apiClient.post(`/orders/${orderId}/deliver`);
    return {
      success: true,
      order: response.data?.data || response.data,
      message: response.data?.message || 'Delivery Completed Successfully.'
    };
  },

  async pickupOrder(orderId) {
    const response = await apiClient.post(`/rider/orders/${orderId}/pickup`);
    return response.data?.data?.order || response.data?.order || response.data?.data || response.data;
  }
};
