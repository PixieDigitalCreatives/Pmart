import { mockRiders } from '../data/mockRiders';
import { mockOrders } from '../data/mockOrders';

export const riderService = {
  async getRiderProfile(riderId = 'rider-201') {
    return mockRiders.find(r => r.id === riderId) || mockRiders[0];
  },

  async getActiveDelivery(riderId = 'rider-201') {
    return mockOrders.find(o => o.status === 'out_for_delivery' || o.status === 'picked_up' || o.status === 'rider_assigned') || mockOrders[0];
  },

  async getRiderHistory(riderId = 'rider-201') {
    return mockOrders.filter(o => o.status === 'delivered');
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
    const order = mockOrders.find(o => o.id === orderId);
    if (order) {
      order.status = stage;
      return order;
    }
    return { success: true, stage };
  },

  async verifyDeliveryOtp(orderId, enteredOtp) {
    const order = mockOrders.find(o => o.id === orderId) || mockOrders[0];
    
    // In demo, check matching OTP or demo override '1234'
    if (enteredOtp === order.deliveryOtp || enteredOtp === '1234') {
      order.status = 'delivered';
      return {
        success: true,
        message: 'Delivery confirmed successfully! Earnings credited.'
      };
    } else {
      throw new Error('Invalid or expired Delivery OTP. Please verify with the customer.');
    }
  }
};
