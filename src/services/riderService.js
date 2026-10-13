import apiClient from './apiClient';
import { mapOrder } from './orderService';

export const riderService = {
  async getProfile() {
    const res = await apiClient.get('/rider/profile');
    return res.data.data;
  },

  async updateVehicle(payload) {
    const res = await apiClient.put('/rider/profile', payload);
    return res.data.data;
  },

  async setAvailability(status) {
    const res = await apiClient.patch('/rider/availability', { status });
    return res.data.data;
  },

  async getActiveOrder() {
    const res = await apiClient.get('/rider/active-order');
    return res.data.data ? mapOrder(res.data.data) : null;
  },

  async getHistory(page = 1) {
    const res = await apiClient.get('/orders', { params: { status: 'DELIVERED,DELIVERY_FAILED,CANCELLED', page, limit: 20 } });
    return { orders: (res.data.data || []).map(mapOrder), pagination: res.data.pagination };
  },

  async pickup(orderId) {
    const res = await apiClient.post(`/rider/orders/${orderId}/pickup`);
    return mapOrder(res.data.data);
  }
};
