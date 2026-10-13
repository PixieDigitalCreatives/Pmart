import api from './apiClient';

const data = (res) => res.data.data;

export const adminService = {
  async getDashboard() {
    return data(await api.get('/admin/dashboard'));
  },

  async getReports(period) {
    return data(await api.get('/admin/reports', { params: { period } }));
  },

  async getPayments(params = {}) {
    const res = await api.get('/admin/payments', { params });
    return { rows: res.data.data, summary: res.data.summary, pagination: res.data.pagination };
  },

  async getAuditLogs(page = 1, limit = 50) {
    const res = await api.get('/admin/audit-logs', { params: { page, limit } });
    return { logs: res.data.data, pagination: res.data.pagination };
  },

  // ----- Orders -----
  async getOrders(params = {}) {
    const res = await api.get('/admin/orders', { params });
    return { orders: res.data.data, pagination: res.data.pagination };
  },

  async getActiveDeliveries() {
    return data(await api.get('/admin/deliveries'));
  },

  /** Downloads the orders CSV using the authenticated client and saves it via a temporary link. */
  async downloadOrdersCsv(params = {}) {
    const res = await api.get('/admin/orders/export.csv', { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmart-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ----- Stores -----
  async getShops() {
    return data(await api.get('/admin/shops'));
  },

  async createShop(payload) {
    return data(await api.post('/admin/shops', payload));
  },

  async updateShop(id, payload) {
    return data(await api.put(`/admin/shops/${id}`, payload));
  },

  // ----- Customers -----
  async getCustomers(params = {}) {
    const res = await api.get('/admin/customers', { params });
    return { customers: res.data.data, pagination: res.data.pagination };
  },

  async setCustomerActive(id, isActive) {
    return data(await api.patch(`/admin/customers/${id}/status`, { isActive }));
  },

  // ----- Riders -----
  async getRiders() {
    return data(await api.get('/admin/riders'));
  },

  async createRider(payload) {
    return (await api.post('/admin/riders', payload)).data;
  },

  async updateRider(id, payload) {
    return (await api.put(`/admin/riders/${id}`, payload)).data;
  },

  async setRiderActive(id, isActive) {
    return (await api.patch(`/admin/riders/${id}/status`, { isActive })).data;
  },

  async resetRiderPassword(id, password) {
    return (await api.post(`/admin/riders/${id}/reset-password`, { password })).data;
  },

  // ----- Staff -----
  async getEmployees() {
    const res = await api.get('/admin/employees');
    return { employees: res.data.data, availablePermissions: res.data.availablePermissions };
  },

  async createEmployee(payload) {
    return data(await api.post('/admin/employees', payload));
  },

  async updateEmployee(id, payload) {
    return (await api.put(`/admin/employees/${id}`, payload)).data;
  },

  async regenerateActivationLink(id) {
    return data(await api.post(`/admin/employees/${id}/activation-link`));
  },

  // ----- Settings -----
  async getSettings() {
    return data(await api.get('/admin/settings'));
  },

  async updateSettings(payload) {
    return data(await api.put('/admin/settings', payload));
  }
};
