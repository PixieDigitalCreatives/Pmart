import { mockProducts } from '../data/mockProducts';

export const productService = {
  // Get all products with filtering, sorting and pagination
  async getProducts(params = {}) {
    const { category, search, tag, sortBy, minPrice, maxPrice, inStockOnly, page = 1, limit = 20 } = params;

    let results = [...mockProducts];

    if (category) {
      results = results.filter(p => p.categorySlug === category || p.subcategory === category);
    }

    if (tag) {
      results = results.filter(p => p.tags && p.tags.includes(tag));
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      results = results.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.categorySlug.toLowerCase().includes(q)
      );
    }

    if (minPrice !== undefined) {
      results = results.filter(p => p.price >= Number(minPrice));
    }

    if (maxPrice !== undefined) {
      results = results.filter(p => p.price <= Number(maxPrice));
    }

    if (inStockOnly) {
      results = results.filter(p => p.inStock);
    }

    // Sorting
    if (sortBy === 'price-low') {
      results.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      results.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'discount') {
      results.sort((a, b) => b.discount - a.discount);
    } else if (sortBy === 'rating') {
      results.sort((a, b) => b.rating - a.rating);
    }

    const startIndex = (page - 1) * limit;
    const paginated = results.slice(startIndex, startIndex + limit);

    return {
      products: paginated,
      totalCount: results.length,
      page,
      totalPages: Math.ceil(results.length / limit)
    };
  },

  // Get single product by slug
  async getProductBySlug(slug) {
    const product = mockProducts.find(p => p.slug === slug);
    if (!product) {
      throw new Error(`Product not found with slug: ${slug}`);
    }
    return product;
  },

  // Get single product by ID
  async getProductById(id) {
    const product = mockProducts.find(p => p.id === id);
    if (!product) {
      throw new Error(`Product not found with id: ${id}`);
    }
    return product;
  },

  // Get products by specific collection tags (e.g. 'daily-essentials', 'fresh-picks', 'under-99')
  async getProductsByTag(tag, limit = 8) {
    const matches = mockProducts.filter(p => p.tags && p.tags.includes(tag));
    return matches.slice(0, limit);
  },

  // Search autocomplete & query
  async searchProducts(query) {
    if (!query || query.trim().length === 0) return [];
    const q = query.toLowerCase().trim();
    return mockProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.subcategory.toLowerCase().includes(q)
    ).slice(0, 10);
  },

  // Shop / Admin CRUD operations
  async createProduct(data) {
    const newProduct = {
      id: `prod-${Date.now()}`,
      slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      reviewsCount: 0,
      rating: 5.0,
      inStock: true,
      deliveryTime: 'EXPRESS',
      tags: ['new-arrivals'],
      ...data
    };
    mockProducts.unshift(newProduct);
    return newProduct;
  },

  async updateProduct(id, data) {
    const index = mockProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProducts[index] = { ...mockProducts[index], ...data };
      return mockProducts[index];
    }
    throw new Error('Product not found for update');
  },

  async deleteProduct(id) {
    const index = mockProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      const deleted = mockProducts.splice(index, 1);
      return deleted[0];
    }
    throw new Error('Product not found for deletion');
  }
};
