import { mockShops } from '../data/mockShops';
import { mockOrders } from '../data/mockOrders';
import { mockProducts } from '../data/mockProducts';

export const shopService = {
  async getShopDetails(shopId = 'shop-101') {
    return mockShops.find(s => s.id === shopId) || mockShops[0];
  },

  async getShopMetrics(shopId = 'shop-101') {
    return {
      todayOrders: 148,
      pendingOrders: 12,
      preparingOrders: 6,
      outForDelivery: 18,
      todayRevenue: 48920,
      inventoryAlerts: 4,
      activeRiders: 18
    };
  },

  async getShopOrders(status = 'all') {
    if (status === 'all') return mockOrders;
    return mockOrders.filter(o => o.status === status);
  },

  async getInventory(category = null) {
    let items = [...mockProducts];
    if (category) {
      items = items.filter(i => i.categorySlug === category);
    }
    return items;
  },

  async assignRider(orderId, riderId) {
    return {
      success: true,
      message: `Rider ${riderId} assigned to order ${orderId}`
    };
  }
};
