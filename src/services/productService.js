import apiClient from './apiClient';

export const productService = {
  // Get all products with filtering, sorting and pagination
  async getProducts(params = {}) {
    const response = await apiClient.get('/products', { params });
    return response.data.data;
  },

  async getAdminProducts(params = {}) {
    const response = await apiClient.get('/admin/products', { params });
    return response.data.data;
  },

  // Get single product by slug
  async getProductBySlug(slug) {
    const response = await apiClient.get(`/products/slug/${slug}`);
    return response.data.data;
  },

  // Get single product by ID
  async getProductById(id) {
    const response = await apiClient.get(`/products/${id}`);
    return response.data.data;
  },

  // Get products by specific collection tags (e.g. 'daily-essentials', 'fresh-picks', 'under-99')
  async getProductsByTag(tag, limit = 8) {
    const response = await apiClient.get(`/products/tag/${tag}`, { params: { limit } });
    return response.data.data;
  },

  // Search autocomplete & query
  async searchProducts(query) {
    if (!query || query.trim().length === 0) return [];
    const response = await apiClient.get('/products/search', { params: { q: query } });
    return response.data.data;
  },

  // Shop / Admin CRUD operations
  async createProduct(data) {
    const response = await apiClient.post('/products', data);
    return response.data;
  },

  async updateProduct(id, data) {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data;
  },

  async updateProductStatus(id, isActive) {
    const response = await apiClient.patch(`/products/${id}/status`, { isActive });
    return response.data;
  },

  async deleteProduct(id) {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  }
};
