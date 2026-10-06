import apiClient from './apiClient';

export const categoryService = {
  // Get all categories
  async getCategories() {
    const response = await apiClient.get('/categories');
    return response.data.data;
  },

  async getAdminCategories() {
    const response = await apiClient.get('/admin/categories');
    return response.data.data;
  },

  // Get single category by slug
  async getCategoryBySlug(slug) {
    const response = await apiClient.get(`/categories/${slug}`);
    return response.data.data;
  },

  // Get subcategories for a given category
  async getSubcategories(slug) {
    const response = await apiClient.get(`/categories/${slug}`);
    return response.data.data.subcategories || [];
  },

  // Admin / CRUD operations
  async createCategory(data) {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  async updateCategory(id, data) {
    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data;
  },

  async updateCategoryStatus(id, isActive) {
    const response = await apiClient.patch(`/categories/${id}/status`, { isActive });
    return response.data;
  },

  async deleteCategory(id) {
    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  }
};
