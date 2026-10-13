import apiClient from './apiClient';

export const categoryService = {
  async getCategories() {
    const res = await apiClient.get('/categories');
    return res.data.data;
  },

  async getCategoryBySlug(slug) {
    const res = await apiClient.get(`/categories/${encodeURIComponent(slug)}`);
    return res.data.data;
  },

  // ----- Management -----

  async getManagedCategories() {
    const res = await apiClient.get('/manage/categories');
    return res.data.data;
  },

  async createCategory(data) {
    const res = await apiClient.post('/manage/categories', data);
    return res.data.data;
  },

  async updateCategory(id, data) {
    const res = await apiClient.put(`/manage/categories/${id}`, data);
    return res.data.data;
  },

  async setCategoryActive(id, isActive) {
    const res = await apiClient.patch(`/manage/categories/${id}/status`, { isActive });
    return res.data.data;
  },

  async deleteCategory(id) {
    const res = await apiClient.delete(`/manage/categories/${id}`);
    return res.data;
  }
};
