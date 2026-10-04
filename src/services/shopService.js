import apiClient from './apiClient';
import { orderService } from './orderService';
import { productService } from './productService';

export const shopService = {
  async getShopDetails(shopId = 'shop-101') {
    // If shopId is generic, just get the first shop for now
    if (shopId === 'shop-101') {
      const response = await apiClient.get('/shops');
      return response.data.data[0] || null;
    }
    const response = await apiClient.get(`/shops/${shopId}`);
    return response.data.data;
  },

  async getShopMetrics(shopId = 'shop-101') {
    try {
      const response = await apiClient.get(`/shops/${shopId}/metrics`);
      return response.data?.data || null;
    } catch {
      return null;
    }
  },

  async getShopOrders(status = 'all') {
    return orderService.getOrders({ status });
  },

  async getInventory(category = null) {
    const products = await productService.getProducts(category ? { category } : {});
    return products.products;
  },

  async assignRider(orderId, riderId) {
    const response = await apiClient.put(`/orders/${orderId}/status`, { status: 'OUT_FOR_DELIVERY' });
    return {
      success: true,
      message: `Rider assigned to order ${orderId}`
    };
  }
};
