import apiClient from './apiClient';

export const productService = {
  /** Storefront listing: { products, totalCount, page, totalPages, hasMore } */
  async getProducts(params = {}, signal) {
    const res = await apiClient.get('/products', { params, signal });
    return res.data.data;
  },

  async getProductBySlug(slug, signal) {
    const res = await apiClient.get(`/products/slug/${encodeURIComponent(slug)}`, { signal });
    return res.data.data;
  },

  async getProductsByTag(tag, limit = 8, signal) {
    const res = await apiClient.get(`/products/tag/${encodeURIComponent(tag)}`, { params: { limit }, signal });
    return res.data.data;
  },

  async searchProducts(query, signal) {
    if (!query || !query.trim()) return [];
    const res = await apiClient.get('/products/search', { params: { q: query.trim() }, signal });
    return res.data.data;
  },

  // ----- Catalog management (admin, catalog staff, shop owners) -----

  async getManagedProducts(params = {}) {
    const res = await apiClient.get('/manage/products', { params });
    return res.data.data;
  },

  async getManagedProduct(id) {
    const res = await apiClient.get(`/manage/products/${id}`);
    return res.data.data;
  },

  async createProduct(data) {
    const res = await apiClient.post('/manage/products', data);
    return res.data.data;
  },

  async bulkCreateProducts(products) {
    const res = await apiClient.post('/manage/products/bulk', { products }, { timeout: 120000 });
    return res.data.data;
  },

  async updateProduct(id, data) {
    const res = await apiClient.put(`/manage/products/${id}`, data);
    return res.data.data;
  },

  async setProductActive(id, isActive) {
    const res = await apiClient.patch(`/manage/products/${id}/status`, { isActive });
    return res.data.data;
  },

  async archiveProduct(id) {
    const res = await apiClient.delete(`/manage/products/${id}`);
    return res.data;
  },

  async deleteProduct(id, hard = true) {
    const res = await apiClient.delete(`/manage/products/${id}`, { params: hard ? { hard: 1 } : {} });
    return res.data;
  },

  async bulkDeleteProducts(ids, hard = true) {
    const res = await apiClient.post('/manage/products/bulk-delete', { ids, hard }, { timeout: 60000 });
    return res.data.data;
  },

  async bulkUpdateProducts(ids, updates = {}) {
    const res = await apiClient.patch('/manage/products/bulk-update', { ids, ...updates }, { timeout: 60000 });
    return res.data.data;
  }
};
