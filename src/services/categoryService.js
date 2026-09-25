import { mockCategories } from '../data/mockCategories';

export const categoryService = {
  // Get all categories
  async getCategories() {
    return [...mockCategories];
  },

  // Get single category by slug
  async getCategoryBySlug(slug) {
    const category = mockCategories.find(c => c.slug === slug);
    if (!category) {
      throw new Error(`Category not found with slug: ${slug}`);
    }
    return category;
  },

  // Get subcategories for a given category
  async getSubcategories(slug) {
    const category = mockCategories.find(c => c.slug === slug);
    return category ? category.subcategories : [];
  }
};
