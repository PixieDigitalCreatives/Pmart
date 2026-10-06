import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { categoryService } from '@/services/categoryService';
import { productService } from '@/services/productService';
import { ProductCard } from '@/components/product/ProductCard';
import { ChevronRight, Filter, ArrowUpDown } from 'lucide-react';
import './CategoryPage.scss';
import { Select } from '@/components/ui';

export const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeSubcategory, setActiveSubcategory] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategoryData = async () => {
      setLoading(true);
      try {
        const [cat, all] = await Promise.all([
          categoryService.getCategoryBySlug(slug),
          categoryService.getCategories()
        ]);
        setCategory(cat);
        setAllCategories(all || []);
        setActiveSubcategory('All');

        const res = await productService.getProducts({ category: slug });
        setProducts(res.products);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCategoryData();
  }, [slug]);

  const handleCategoryChange = (e) => {
    const newSlug = e.target.value;
    if (newSlug && newSlug !== slug) {
      navigate(`/category/${newSlug}`);
    }
  };

  const handleSubcategoryChange = async (sub) => {
    setActiveSubcategory(sub);
    const filterCat = sub === 'All' ? slug : sub;
    const res = await productService.getProducts({ category: filterCat });
    setProducts(res.products);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setSortBy(val);

    let sorted = [...products];
    if (val === 'price-low') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (val === 'price-high') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (val === 'discount') {
      sorted.sort((a, b) => b.discount - a.discount);
    } else if (val === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    }
    setProducts(sorted);
  };

  if (!category && !loading) {
    return (
      <div className="container py-8 text-center">
        <h3>Category not found</h3>
        <Button component={Link} to="/" variant="primary" className="mt-4">Return to Home</Button>
      </div>
    );
  }

  return (
    <div className="pmart-category-page">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="category-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={14} className="separator" />
          <Link to="/">Categories</Link>
          <ChevronRight size={14} className="separator" />
          <span className="current-crumb">{category?.name}</span>
        </nav>

        <div className="category-page-header">
          <h1 className="category-page-title">{category?.name}</h1>
        </div>

        {/* Toolbar: Category Dropdown (All 18 Categories), Subcategory Filter, Count & Sort */}
        <div className="category-toolbar">
          <div className="toolbar-left-group">
            {/* All 18 Categories Dropdown */}
            <div className="toolbar-control-item">
              <label htmlFor="cat-dropdown-filter">Categories:</label>
              <Select
                id="cat-dropdown-filter"
                className="form-select category-filter-select"
                value={category?.slug || slug}
                onChange={handleCategoryChange}
              >
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Subcategories Filter for the selected category */}
            {category?.subcategories && category.subcategories.length > 0 && (
              <div className="toolbar-control-item">
                <label htmlFor="subcat-dropdown-filter">Subcategory:</label>
                <Select
                  id="subcat-dropdown-filter"
                  className="form-select subcategory-filter-select"
                  value={activeSubcategory}
                  onChange={(e) => handleSubcategoryChange(e.target.value)}
                >
                  <option value="All">All {category.name}</option>
                  {category.subcategories.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </Select>
              </div>
            )}

            <div className="items-count-text">
              Showing <strong>{products.length}</strong> items in {category?.name}
            </div>
          </div>

          <div className="toolbar-sort">
            <label htmlFor="cat-sort">Sort by:</label>
            <Select
              id="cat-sort"
              className="form-select sort-select"
              value={sortBy}
              onChange={handleSortChange}
            >
              <option value="default">Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="discount">Discount Percentage</option>
              <option value="rating">Customer Rating</option>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="empty-category-notice">
            <p>No products available in this subcategory at the moment.</p>
            <Button variant="secondary" className="mt-2" onClick={() => handleSubcategoryChange('All')}>
              Show all products in {category?.name}
            </Button>
          </div>
        ) : (
          <div className="category-products-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
