import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { categoryService } from '@/services/categoryService';
import { productService } from '@/services/productService';
import { ProductCard } from '@/components/product/ProductCard';
import { ChevronRight, PackageOpen } from 'lucide-react';
import { Select, Button, EmptyState, LoadingState } from '@/components/ui';
import './CategoryPage.scss';

const PAGE_SIZE = 24;

export const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [subcategory, setSubcategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNotFound(false);
    setSubcategory('');
    Promise.all([categoryService.getCategoryBySlug(slug), categoryService.getCategories()])
      .then(([cat, all]) => {
        if (cancelled) return;
        setCategory(cat);
        setAllCategories(all || []);
      })
      .catch(() => !cancelled && setNotFound(true));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productService
      .getProducts({ category: slug, subcategory: subcategory || undefined, sort, page: 1, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.products);
        setTotalCount(res.totalCount);
        setPage(1);
      })
      .catch(() => !cancelled && setProducts([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug, subcategory, sort]);

  const loadMore = async () => {
    const next = page + 1;
    const res = await productService.getProducts({ category: slug, subcategory: subcategory || undefined, sort, page: next, limit: PAGE_SIZE });
    setProducts((prev) => [...prev, ...res.products]);
    setPage(next);
  };

  if (notFound) {
    return (
      <div className="container py-12 text-center">
        <EmptyState icon={PackageOpen} title="Category not found" description="It may have been removed." action={<Button component={Link} to="/" variant="primary">Back to home</Button>} />
      </div>
    );
  }

  return (
    <div className="pmart-category-page">
      <div className="container">
        <nav className="category-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={14} className="separator" />
          <span className="current-crumb">{category?.name}</span>
        </nav>

        <div className="category-page-header">
          <h1 className="category-page-title">{category?.name}</h1>
          {category?.description && <p className="text-muted mt-1">{category.description}</p>}
        </div>

        <div className="category-toolbar">
          <div className="toolbar-left-group">
            <div className="toolbar-control-item">
              <label htmlFor="cat-dropdown-filter">Category:</label>
              <Select id="cat-dropdown-filter" className="form-select category-filter-select" value={slug} onChange={(e) => navigate(`/category/${e.target.value}`)}>
                {allCategories.map((cat) => (
                  <option key={cat._id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            {category?.subcategories?.length > 0 && (
              <div className="toolbar-control-item">
                <label htmlFor="subcat-dropdown-filter">Type:</label>
                <Select id="subcat-dropdown-filter" className="form-select subcategory-filter-select" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                  <option value="">All {category.name}</option>
                  {category.subcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="items-count-text">
              <strong>{totalCount}</strong> {totalCount === 1 ? 'item' : 'items'}
            </div>
          </div>

          <div className="toolbar-sort">
            <label htmlFor="cat-sort">Sort by:</label>
            <Select id="cat-sort" className="form-select sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="discount">Biggest discount</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <LoadingState text="Loading products..." />
        ) : products.length === 0 ? (
          <div className="empty-category-notice">
            <EmptyState icon={PackageOpen} title="Nothing here yet" description="There are no products in this category right now." />
          </div>
        ) : (
          <>
            <div className="category-products-grid">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
            {products.length < totalCount && (
              <div className="text-center mt-6">
                <Button variant="secondary" onClick={loadMore}>
                  Show more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
