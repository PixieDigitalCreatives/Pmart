import apiClient from './apiClient';

export const categoryService = {
  // Get all categories
  async getCategories() {
    const response = await apiClient.get('/categories');
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
  }
};
