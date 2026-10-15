import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { useCart } from '@/context/CartContext';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { ArrowRight, Truck, Store } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import './HomePage.scss';

// Products are grouped on the home page by these catalog tags (set in the product editor).
const TAG_SECTIONS = [
  { tag: 'daily-essentials', title: 'Daily Essentials' },
  { tag: 'fresh-picks', title: 'Fresh Picks' },
  { tag: 'best-deals', title: 'Best Deals' },
  { tag: 'under-99', title: 'Under ₹99' }
];

export const HomePage = () => {
  const { settings } = useCart();
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

  const firstCategory = categories[0];
  const catalogEmpty = !loading && categories.length === 0 && newArrivals.length === 0;

  return (
    <div className="pmart-home-page">
      <section className="home-hero-section full-width-hero">
        <div className="hero-banner-card">
          <div className="hero-backdrop-media">
            <img src="/hero-bg.png" alt="" className="hero-grocery-img" />
            <div className="hero-gradient-overlay" />
          </div>
          <div className="hero-container-inner">
            <div className="hero-text-content">
              <h1 className="hero-title">
                Everything you need, <br />
                <span className="highlight-text">delivered fast.</span>
              </h1>
              <p className="hero-desc">Fresh produce, dairy, pantry staples and household essentials from your nearby PMart store.</p>
              <div className="hero-actions">
                <Button component={Link} to={firstCategory ? `/category/${firstCategory.slug}` : '/search'} variant="primary" size="lg" className="hero-cta">
                  <span>Start shopping</span>
                  <ArrowRight size={18} />
                </Button>
                {settings.freeDeliveryThreshold > 0 && (
                  <div className="hero-guarantee">
                    <Truck size={18} className="shield-icon" />
                    <span>Free delivery on orders above ₹{settings.freeDeliveryThreshold}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
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
                  <h2 className="section-heading">Shop by category</h2>
                </div>
                <div className="categories-grid-track">
                  {categories.map((cat) => (
                    <Link key={cat._id} to={`/category/${cat.slug}`} className="category-pill-card">
                      <div className="cat-image-box">
                        {cat.imageUrl ? <img src={cat.imageUrl} alt="" loading="lazy" decoding="async" /> : <Store size={28} aria-hidden="true" />}
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
