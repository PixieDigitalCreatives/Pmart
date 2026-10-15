import apiClient from './apiClient';

let cachedCategories = null;
let cacheTimestamp = 0;
const CLIENT_CACHE_TTL_MS = 60 * 1000;

export const categoryService = {
  async getCategories(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedCategories && now - cacheTimestamp < CLIENT_CACHE_TTL_MS) {
      return cachedCategories;
    }
    const res = await apiClient.get('/categories');
    cachedCategories = res.data.data;
    cacheTimestamp = now;
    return cachedCategories;
  },

  invalidateClientCache() {
    cachedCategories = null;
    cacheTimestamp = 0;
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
    this.invalidateClientCache();
    return res.data.data;
  },

  async updateCategory(id, data) {
    const res = await apiClient.put(`/manage/categories/${id}`, data);
    this.invalidateClientCache();
    return res.data.data;
  },

  async setCategoryActive(id, isActive) {
    const res = await apiClient.patch(`/manage/categories/${id}/status`, { isActive });
    this.invalidateClientCache();
    return res.data.data;
  },

  async deleteCategory(id) {
    const res = await apiClient.delete(`/manage/categories/${id}`);
    this.invalidateClientCache();
    return res.data;
  }
};
