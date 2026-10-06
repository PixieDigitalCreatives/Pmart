import { orderService } from './orderService';
import { deliveryOtpService } from './deliveryOtpService';
import { deliveryService } from './deliveryService';
import { normalizeOrderStatus, ORDER_STATUS } from '../types/orderTypes';
import apiClient from './apiClient';

export const riderService = {
  async getRiderProfile() {
    const response = await apiClient.get('/rider/profile');
    return response.data.data || response.data; // Handle both wrapped and unwrapped just in case
  },

  async getActiveDelivery() {
    const all = await orderService.getOrders();
    // Prioritize active in-flight orders
    return all.find(o => {
      const norm = normalizeOrderStatus(o.orderStatus || o.status);
      return norm === ORDER_STATUS.ASSIGNED ||
             norm === ORDER_STATUS.READY_FOR_PICKUP ||
             norm === ORDER_STATUS.PICKED_UP ||
             norm === ORDER_STATUS.OUT_FOR_DELIVERY ||
             norm === ORDER_STATUS.ARRIVED;
    }) || null;
  },

  async getRiderHistory() {
    const all = await orderService.getOrders();
    return all.filter(o => normalizeOrderStatus(o.orderStatus || o.status) === ORDER_STATUS.DELIVERED);
  },

  async updateRiderStatus(status) {
    const res = await apiClient.put('/users/profile', { availabilityStatus: status });
    return res.data.data;
  },

  async updateDeliveryStage(orderId, stage) {
    return orderService.updateOrderStatus(orderId, stage);
  },

  async verifyDeliveryOtp(orderId, enteredOtp) {
    // 1. Verify OTP with deliveryOtpService
    await deliveryOtpService.verifyDeliveryOtp(orderId, enteredOtp);

    // 2. Complete delivery through deliveryService with all strict checks
    const res = await deliveryService.completeDelivery(orderId);

    return {
      success: true,
      message: 'Delivery confirmed successfully! Earnings credited.',
      order: res.order
    };
  }
};
