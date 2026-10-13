import apiClient from './apiClient';

/** Endpoints for the signed-in shop owner's own store. */
export const shopService = {
  async getMyShop() {
    const res = await apiClient.get('/shops/mine');
    return res.data.data;
  },

  async updateMyShop(data) {
    const res = await apiClient.put('/shops/mine', data);
    return res.data.data;
  },

  async getMyMetrics() {
    const res = await apiClient.get('/shops/mine/metrics');
    return res.data.data;
  },

  async getPublicShops() {
    const res = await apiClient.get('/shops');
    return res.data.data;
  }
};
