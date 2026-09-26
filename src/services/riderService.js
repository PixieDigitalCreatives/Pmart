import { mockRiders } from '../data/mockRiders';
import { orderService } from './orderService';
import { deliveryOtpService } from './deliveryOtpService';
import { deliveryService } from './deliveryService';
import { normalizeOrderStatus, ORDER_STATUS } from '../types/orderTypes';

export const riderService = {
  async getRiderProfile(riderId = 'rider-201') {
    return mockRiders.find(r => r.id === riderId) || mockRiders[0];
  },

  async getActiveDelivery(riderId = 'rider-201') {
    const all = await orderService.getOrders();
    // Prioritize active in-flight orders
    return (
      all.find(o => {
        const norm = normalizeOrderStatus(o.orderStatus || o.status);
        return norm === ORDER_STATUS.OUT_FOR_DELIVERY ||
               norm === ORDER_STATUS.ARRIVED ||
               norm === ORDER_STATUS.READY_FOR_PICKUP;
      }) || all[0]
    );
  },

  async getRiderHistory(riderId = 'rider-201') {
    const all = await orderService.getOrders();
    return all.filter(o => normalizeOrderStatus(o.orderStatus || o.status) === ORDER_STATUS.DELIVERED);
  },

  async updateRiderStatus(riderId, status) {
    const rider = mockRiders.find(r => r.id === riderId);
    if (rider) {
      rider.status = status;
      return rider;
    }
    return { status };
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
