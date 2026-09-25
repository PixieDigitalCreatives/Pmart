import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { categoryService } from '@/services/categoryService';
import { productService } from '@/services/productService';
import { ProductCard } from '@/components/product/ProductCard';
import { ChevronRight, Filter, ArrowUpDown } from 'lucide-react';
import './CategoryPage.scss';

export const CategoryPage = () => {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeSubcategory, setActiveSubcategory] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategoryData = async () => {
      setLoading(true);
      try {
        const cat = await categoryService.getCategoryBySlug(slug);
        setCategory(cat);
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
        <Link to="/" className="btn btn-primary mt-4">Return to Home</Link>
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

        {/* Category Hero Banner */}
        <div className="category-hero-header">
          <div className="cat-header-text">
            <span className="sub-badge">EXPRESS GROCERY</span>
            <h1 className="category-title">{category?.name}</h1>
            <p className="category-desc">{category?.description}</p>
          </div>
          {category?.image && (
            <img src={category.image} alt={category.name} className="cat-header-img" />
          )}
        </div>

        {/* Subcategories Strip */}
        {category?.subcategories && category.subcategories.length > 0 && (
          <div className="subcategories-chip-strip">
            <button
              className={`subcat-chip ${activeSubcategory === 'All' ? 'active' : ''}`}
              onClick={() => handleSubcategoryChange('All')}
            >
              All {category.name}
            </button>
            {category.subcategories.map((sub, i) => (
              <button
                key={i}
                className={`subcat-chip ${activeSubcategory === sub ? 'active' : ''}`}
                onClick={() => handleSubcategoryChange(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Toolbar: Count & Sort */}
        <div className="category-toolbar">
          <div className="items-count-text">
            Showing <strong>{products.length}</strong> items in {category?.name}
          </div>

          <div className="toolbar-sort">
            <label htmlFor="cat-sort">Sort by:</label>
            <select
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
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="empty-category-notice">
            <p>No products available in this subcategory at the moment.</p>
            <button className="btn btn-secondary mt-2" onClick={() => handleSubcategoryChange('All')}>
              Show all products in {category?.name}
            </button>
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
