import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { ProductCard } from '@/components/product/ProductCard';
import { SlidersHorizontal, SearchX } from 'lucide-react';
import { Button, Select, EmptyState, LoadingState } from '@/components/ui';
import './SearchPage.scss';
import { plural } from '@/utils/plural';

const PAGE_SIZE = 24;

export const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim();

  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Reset to the first page whenever the query or a filter changes.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    productService
      .getProducts(
        {
          search: query || undefined,
          category: category || undefined,
          sort,
          inStockOnly: inStockOnly ? 'true' : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          page: 1,
          limit: PAGE_SIZE
        },
        controller.signal
      )
      .then((res) => {
        setProducts(res.products);
        setTotalCount(res.totalCount);
        setPage(1);
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setProducts([]);
      })
      .finally(() => setLoading(false));
    return () => {
      controller.abort();
    };
  }, [query, category, sort, inStockOnly, maxPrice]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    try {
      const res = await productService.getProducts({
        search: query || undefined,
        category: category || undefined,
        sort,
        inStockOnly: inStockOnly ? 'true' : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        page: next,
        limit: PAGE_SIZE
      });
      setProducts((prev) => [...prev, ...res.products]);
      setPage(next);
    } catch {
      // Keep existing products
    } finally {
      setLoadingMore(false);
    }
  };

  const hasFilters = category || inStockOnly || maxPrice;

  return (
    <div className="pmart-search-page">
      <div className="container">
        <div className="search-layout-grid">
          <aside className="filters-sidebar">
            <div className="filter-header">
              <div className="filter-title-group">
                <SlidersHorizontal size={16} />
                <span>Filters</span>
              </div>
              {hasFilters && (
                <Button
                  className="reset-filters-btn"
                  onClick={() => {
                    setCategory('');
                    setInStockOnly(false);
                    setMaxPrice('');
                  }}
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="filter-group">
              <span className="group-label">Category</span>
              <div className="category-options-list">
                <Button className={`cat-filter-option ${category === '' ? 'active' : ''}`} onClick={() => setCategory('')}>
                  All categories
                </Button>
                {categories.map((c) => (
                  <Button key={c._id} className={`cat-filter-option ${category === c.slug ? 'active' : ''}`} onClick={() => setCategory(c.slug)}>
                    {c.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label htmlFor="max-price" className="group-label">Maximum price (₹)</label>
              <input
                id="max-price"
                type="number"
                min="1"
                className="form-control"
                placeholder="Any price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>

            <div className="filter-group checkbox-group">
              <label htmlFor="in-stock-only" className="checkbox-label">
                <input id="in-stock-only" type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                <span>In stock only</span>
              </label>
            </div>
          </aside>

          <main className="search-results-main">
            <div className="results-top-bar">
              <div className="results-counter">
                {query ? (
                  <span>
                    Results for <strong>"{query}"</strong>
                  </span>
                ) : (
                  <span>All products</span>
                )}
                <span className="count-pill">({plural(totalCount, 'item')})</span>
              </div>
              <div className="sort-wrapper">
                <label htmlFor="sort-select" className="sort-label">Sort by:</label>
                <Select id="sort-select" className="form-select sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="discount">Biggest discount</option>
                  <option value="name">Name</option>
                </Select>
              </div>
            </div>

            {loading ? (
              <LoadingState text="Searching..." />
            ) : products.length === 0 ? (
              <EmptyState icon={SearchX} title="No products found" description={query ? 'Try a different word or remove some filters.' : 'No products match these filters.'} />
            ) : (
              <>
                <div className="search-product-grid">
                  {products.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
                {products.length < totalCount && (
                  <div className="text-center mt-6">
                    <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? 'Loading...' : 'Show more'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
