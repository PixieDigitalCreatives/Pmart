import api from './apiClient';

export const adminService = {
  async getPlatformOverview() {
    try {
      const response = await api.get('/admin/dashboard');
      const data = response.data;
      
      return {
        kpis: {
          totalOrders: data.totalOrders || 0,
          activeOrders: data.activeOrders || 0,
          deliveredOrders: data.deliveredOrders || 0,
          totalRevenue: data.revenue || 0,
          todayRevenue: data.todayRevenue || 0,
          activeShops: data.activeShops || 0,
          activeRiders: data.activeRiders || 0,
          totalCustomers: data.registeredCustomers || 0
        },
        deliveryPerformance: {
          avgDeliveryMinutes: data.avgDeliveryMinutes ? `${data.avgDeliveryMinutes} mins` : 'N/A',
          onTimeRate: data.onTimeRate ? `${data.onTimeRate}%` : 'N/A',
          customerSatisfaction: data.customerSatisfaction ? `${data.customerSatisfaction} / 5` : 'N/A'
        }
      };
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      // fallback in case of error so page doesn't crash
      return {
        kpis: {},
        deliveryPerformance: {}
      };
    }
  },

  async getShops() {
    try {
      const res = await api.get('/shops'); // assuming there's a shops endpoint
      return res.data?.data || res.data || [];
    } catch (error) {
      return [];
    }
  },

  async getCustomers() {
    try {
      const res = await api.get('/admin/customers');
      return res.data;
    } catch (error) {
      return [];
    }
  },

  async getRiders() {
    try {
      const res = await api.get('/admin/riders');
      return res.data;
    } catch (error) {
      return [];
    }
  },

  async getEligibleRiders() {
    try {
      const res = await api.get('/admin/riders/eligible');
      return res.data;
    } catch (error) {
      return [];
    }
  },

  async updateRiderStatus(id, isActive) {
    const res = await api.patch(`/admin/riders/${id}/status`, { isActive });
    return res.data;
  },

  async deleteRider(id) {
    const res = await api.delete(`/admin/riders/${id}`);
    return res.data;
  },

  async getReports(period) {
    try {
      const res = await api.get(`/admin/reports?period=${period}`);
      return res.data;
    } catch (error) {
      return null;
    }
  }
};
