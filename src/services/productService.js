import apiClient from './apiClient';

export const productService = {
  /** Storefront listing: { products, totalCount, page, totalPages } */
  async getProducts(params = {}) {
    const res = await apiClient.get('/products', { params });
    return res.data.data;
  },

  async getProductBySlug(slug) {
    const res = await apiClient.get(`/products/slug/${encodeURIComponent(slug)}`);
    return res.data.data;
  },

  async getProductsByTag(tag, limit = 8) {
    const res = await apiClient.get(`/products/tag/${encodeURIComponent(tag)}`, { params: { limit } });
    return res.data.data;
  },

  async searchProducts(query) {
    if (!query || !query.trim()) return [];
    const res = await apiClient.get('/products/search', { params: { q: query.trim() } });
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
  }
};
