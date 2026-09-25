import { mockOrders } from '../data/mockOrders';
import { mockShops } from '../data/mockShops';
import { mockRiders } from '../data/mockRiders';
import { mockProducts } from '../data/mockProducts';

export const adminService = {
  async getPlatformOverview() {
    return {
      kpis: {
        totalOrders: 14280,
        activeOrders: 42,
        deliveredOrders: 13910,
        cancelledOrders: 328,
        totalRevenue: 4892400,
        todayRevenue: 217270,
        activeShops: mockShops.length,
        activeRiders: mockRiders.length + 48,
        totalCustomers: 38400
      },
      recentOrders: mockOrders,
      deliveryPerformance: {
        avgDeliveryMinutes: '11.8 mins',
        onTimeRate: '98.6%',
        customerSatisfaction: '4.85 / 5'
      }
    };
  },

  async getShops() {
    return mockShops;
  },

  async getRiders() {
    return mockRiders;
  },

  async getCustomers() {
    return [
      { id: 'c-1', name: 'Rohan Sharma', phone: '+91 98765 43210', email: 'rohan.sharma@example.com', orders: 48, spent: 18240, status: 'Active', joined: '2024-05-12' },
      { id: 'c-2', name: 'Pooja Verma', phone: '+91 97110 54321', email: 'pooja.verma@example.com', orders: 29, spent: 11450, status: 'Active', joined: '2024-07-22' },
      { id: 'c-3', name: 'Sunil Nair', phone: '+91 99401 23456', email: 'sunil.nair@example.com', orders: 15, spent: 5890, status: 'Active', joined: '2024-09-02' },
      { id: 'c-4', name: 'Megha Gupta', phone: '+91 98110 11998', email: 'megha.g@example.com', orders: 62, spent: 24800, status: 'Active', joined: '2024-02-18' }
    ];
  },

  async getPayments() {
    return [
      { id: 'TXN-9021', orderId: 'PM-88291', customer: 'Rohan Sharma', amount: 200, method: 'UPI (GPay)', status: 'Success', timestamp: '2026-09-25 17:45' },
      { id: 'TXN-9018', orderId: 'PM-88285', customer: 'Pooja Verma', amount: 361, method: 'Card (HDFC)', status: 'Success', timestamp: '2026-09-25 16:10' },
      { id: 'TXN-9015', orderId: 'PM-88279', customer: 'Sunil Nair', amount: 380, method: 'COD', status: 'Pending', timestamp: '2026-09-25 15:40' },
      { id: 'TXN-9011', orderId: 'PM-88270', customer: 'Megha Gupta', amount: 720, method: 'UPI (PhonePe)', status: 'Success', timestamp: '2026-09-25 14:15' }
    ];
  },

  async getReports(period = 'today') {
    return {
      period,
      totalSales: 217270,
      totalOrders: 642,
      avgTicketSize: 338,
      slaBreaches: 4,
      categoryDistribution: [
        { category: 'Fruits & Vegetables', share: '32%' },
        { category: 'Dairy & Breakfast', share: '28%' },
        { category: 'Snacks & Munchies', share: '18%' },
        { category: 'Atta, Rice & Dal', share: '14%' },
        { category: 'Personal Care & Others', share: '8%' }
      ]
    };
  }
};
