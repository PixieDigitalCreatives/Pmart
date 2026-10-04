import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { ProductCard } from '@/components/product/ProductCard';
import { Search, X, SlidersHorizontal, ArrowUpDown, Clock } from 'lucide-react';
import './SearchPage.scss';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [query, setQuery] = useState(queryParam);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceRange, setPriceRange] = useState(1000);

  const popularSearches = ['Amul Milk', 'Tomato', 'Aashirvaad Atta', 'Maggi Noodles', 'Sunflower Oil', 'Chips', 'Dettol Handwash'];
  const recentSearches = ['Milk 1L', 'Basmati Rice', 'Curd', 'Biscuits'];

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true);
      const res = await productService.getProducts({
        search: query,
        category: selectedCategory,
        sortBy: sortBy === 'relevance' ? undefined : sortBy,
        inStockOnly,
        maxPrice: priceRange
      });
      setProducts(res.products);
      setLoading(false);
    };

    fetchFiltered();
  }, [query, selectedCategory, sortBy, inStockOnly, priceRange]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
  };

  const handleChipClick = (term) => {
    setQuery(term);
    setSearchParams({ q: term });
  };

  const handleClear = () => {
    setQuery('');
    setSearchParams({});
  };

  return (
    <div className="pmart-search-page">
      <div className="container">
        {/* Quick Search Chips & Search Status */}
        <div className="search-header-container">
          <div className="quick-tags-container">
            <div className="tags-row">
              <span className="tags-label">Trending:</span>
              <div className="tags-list">
                {popularSearches.map((term, i) => (
                  <button
                    key={i}
                    className={`search-tag-chip ${query.toLowerCase() === term.toLowerCase() ? 'active' : ''}`}
                    onClick={() => handleChipClick(term)}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout: Filters + Results */}
        <div className="search-layout-grid">
          {/* Left: Filter Sidebar */}
          <aside className="filters-sidebar">
            <div className="filter-header">
              <div className="filter-title-group">
                <SlidersHorizontal size={16} />
                <span>Filters</span>
              </div>
              {(selectedCategory || inStockOnly || priceRange < 1000) && (
                <button
                  className="reset-filters-btn"
                  onClick={() => {
                    setSelectedCategory('');
                    setInStockOnly(false);
                    setPriceRange(1000);
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="filter-group">
              <label className="group-label">Category</label>
              <div className="category-options-list">
                <button
                  className={`cat-filter-option ${selectedCategory === '' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('')}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id || c._id}
                    className={`cat-filter-option ${selectedCategory === c.slug ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(c.slug)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="filter-group">
              <div className="flex justify-between items-center mb-1">
                <label className="group-label">Max Price: ₹{priceRange}</label>
              </div>
              <input
                type="range"
                min="30"
                max="1000"
                step="20"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="price-slider"
              />
              <div className="slider-range-markers">
                <span>₹30</span>
                <span>₹1000</span>
              </div>
            </div>

            {/* In Stock toggle */}
            <div className="filter-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
                <span>In Stock only</span>
              </label>
            </div>
          </aside>

          {/* Right: Results Header & Grid */}
          <main className="search-results-main">
            <div className="results-top-bar">
              <div className="results-counter">
                {query ? (
                  <span>Showing results for <strong>"{query}"</strong></span>
                ) : (
                  <span>Showing all available products</span>
                )}
                <span className="count-pill">({products.length} items)</span>
              </div>

              <div className="sort-wrapper">
                <label htmlFor="sort-select" className="sort-label">Sort by:</label>
                <select
                  id="sort-select"
                  className="form-select sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="discount">Highest Discount</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {products.length === 0 ? (
              <div className="no-results-box">
                <div className="no-res-icon">🔍</div>
                <h3>No groceries matched your search</h3>
                <p>Try checking the spelling or browse popular categories below.</p>
                <div className="fallback-suggestions">
                  {popularSearches.slice(0, 4).map((s, idx) => (
                    <button
                      key={idx}
                      className="search-tag-chip"
                      onClick={() => handleChipClick(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="search-product-grid">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
