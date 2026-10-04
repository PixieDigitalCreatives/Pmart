import apiClient from './apiClient';

export const productService = {
  // Get all products with filtering, sorting and pagination
  async getProducts(params = {}) {
    const response = await apiClient.get('/products', { params });
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
    throw new Error('createProduct not implemented in real API yet');
  },

  async updateProduct(id, data) {
    throw new Error('updateProduct not implemented in real API yet');
  },

  async deleteProduct(id) {
    throw new Error('deleteProduct not implemented in real API yet');
  }
};
