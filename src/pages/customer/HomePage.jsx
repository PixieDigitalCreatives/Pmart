import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { TbBuildingStore as Store, TbArrowRight } from 'react-icons/tb';
import { Button, EmptyState } from '@/components/ui';
import { HeroBasketArt } from '@/components/home/HeroBasketArt';
import { CategoryIcon } from '@/components/home/CategoryIcon';
import './HomePage.scss';

// Products are grouped on the home page by these catalog tags (set in the product editor).
const TAG_SECTIONS = [
  { tag: 'daily-essentials', title: 'Daily Essentials' },
  { tag: 'fresh-picks', title: 'Fresh Picks' },
  { tag: 'best-deals', title: 'Best Deals' },
  { tag: 'under-99', title: 'Under ₹99' }
];

export const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [cats, latest, ...tagged] = await Promise.all([
          categoryService.getCategories(),
          productService.getProducts({ sort: 'newest', limit: 12 }),
          ...TAG_SECTIONS.map((s) => productService.getProductsByTag(s.tag, 12).catch(() => []))
        ]);
        if (cancelled) return;
        setCategories(cats || []);
        setNewArrivals(latest?.products || []);
        setSections(Object.fromEntries(TAG_SECTIONS.map((s, i) => [s.tag, tagged[i] || []])));
      } catch {
        // Sections stay empty; the empty-catalog state explains it.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogEmpty = !loading && categories.length === 0 && newArrivals.length === 0;
  const firstCategory = categories[0];

  return (
    <div className="pmart-home-page">
      <section className="home-hero-section container">
        <div className="hero-banner-card">
          <div className="hero-text-content">
            <span className="hero-eyebrow">Fresh groceries, everyday</span>
            <h1 className="hero-title">
              Your Everyday
              <span className="highlight-text">Grocery Store</span>
            </h1>
            <p className="hero-desc">Fresh, quality products delivered from your nearest PMart store.</p>
            <Button component={Link} to={firstCategory ? `/category/${firstCategory.slug}` : '/search'} className="hero-cta">
              <span>Shop Now</span>
              <TbArrowRight size={18} />
            </Button>
          </div>
          <HeroBasketArt />
        </div>
      </section>

      {catalogEmpty ? (
        <div className="container" style={{ padding: '48px 16px' }}>
          <EmptyState icon={Store} title="Our shelves are being stocked" description="Products will appear here as soon as the store adds them. Please check back soon." />
        </div>
      ) : (
        <>
          {categories.length > 0 && (
            <section className="home-categories-section">
              <div className="container">
                <div className="section-header-row">
                  <h2 className="section-heading">Shop by Category</h2>
                  <Link to="/search" className="view-all-link">
                    View All Categories <TbArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
                <div className="categories-grid-track">
                  {categories.map((cat) => (
                    <Link key={cat._id} to={`/category/${cat.slug}`} className="category-pill-card">
                      <div className="cat-image-box">
                        {cat.imageUrl ? <img src={cat.imageUrl} alt="" loading="lazy" decoding="async" /> : <CategoryIcon name={cat.name} />}
                      </div>
                      <span className="cat-name">{cat.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className="container home-carousels-container">
            {TAG_SECTIONS.map((s) => (
              <ProductCarousel key={s.tag} title={s.title} products={sections[s.tag] || []} />
            ))}
            <ProductCarousel title="New in store" viewAllLink="/search" products={newArrivals} />
          </div>
        </>
      )}
    </div>
  );
};
