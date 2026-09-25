import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mockCategories } from '@/data/mockCategories';
import { productService } from '@/services/productService';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { Zap, Clock, ShieldCheck, ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import './HomePage.scss';

export const HomePage = () => {
  const [dailyEssentials, setDailyEssentials] = useState([]);
  const [freshPicks, setFreshPicks] = useState([]);
  const [under99, setUnder99] = useState([]);
  const [bestDeals, setBestDeals] = useState([]);
  const [mostBought, setMostBought] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      const daily = await productService.getProductsByTag('daily-essentials', 8);
      const fresh = await productService.getProductsByTag('fresh-picks', 8);
      const u99 = await productService.getProductsByTag('under-99', 8);
      const deals = await productService.getProductsByTag('best-deals', 8);
      const popular = await productService.getProductsByTag('most-bought', 8);

      setDailyEssentials(daily);
      setFreshPicks(fresh);
      setUnder99(u99);
      setBestDeals(deals);
      setMostBought(popular);
    };

    loadProducts();
  }, []);

  return (
    <div className="pmart-home-page">
      {/* Hero Promotional Banner Section */}
      <section className="home-hero-section">
        <div className="container">
          <div className="hero-banner-card">
            <div className="hero-text-content">
              <div className="hero-badge">
                <Clock size={14} />
                <span>SUPERFAST 10-MINUTE GROCERY DELIVERY</span>
              </div>
              <h1 className="hero-title">
                Everything you need, <br />
                <span className="highlight-text">delivered fast.</span>
              </h1>
              <p className="hero-desc">
                Farm-fresh fruits, daily milk, pantry staples, and household essentials from your local PMart darkstore.
              </p>

              <div className="hero-actions">
                <Link to="/category/fruits-vegetables" className="btn btn-primary btn-lg hero-cta">
                  <span>Shop Fresh Groceries</span>
                  <ArrowRight size={18} />
                </Link>
                <div className="hero-guarantee">
                  <ShieldCheck size={18} className="shield-icon" />
                  <span>100% Quality Guaranteed</span>
                </div>
              </div>
            </div>

            <div className="hero-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"
                alt="Fresh Groceries Delivered in 10 Mins"
                className="hero-grocery-img"
              />
              <div className="floating-stat-card">
                <Zap size={18} className="zap" />
                <div>
                  <div className="stat-bold">10 MINS</div>
                  <div className="stat-label">Average Delivery</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Strip */}
      <section className="home-categories-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <h2 className="section-heading">Explore Categories</h2>
              <p className="section-subtext">Quick access to fresh groceries, dairy, snacks & home needs</p>
            </div>
            <Link to="/category/fruits-vegetables" className="view-all-link">
              <span>View All 18 Categories</span>
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="categories-grid-track">
            {mockCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="category-pill-card"
              >
                <div className="cat-image-box">
                  <img src={cat.image} alt={cat.name} loading="lazy" />
                </div>
                <span className="cat-name">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Promotional Value Strips */}
      <section className="promotional-banners-section">
        <div className="container">
          <div className="promo-banners-grid">
            <div className="promo-banner-card banner-red">
              <div className="banner-content">
                <span className="promo-tag">LIMITED PERIOD OFFER</span>
                <h3 className="promo-heading">Flat ₹100 OFF</h3>
                <p className="promo-text">On first farm-fresh fruits & vegetables order over ₹399</p>
                <div className="coupon-code">Use Code: <strong>PMARTFRESH</strong></div>
              </div>
              <img
                src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80"
                alt="Fruits & Vegetables"
                className="banner-img"
              />
            </div>

            <div className="promo-banner-card banner-charcoal">
              <div className="banner-content">
                <span className="promo-tag">ZERO DELIVERY CHARGES</span>
                <h3 className="promo-heading">FREE Delivery</h3>
                <p className="promo-text">On all grocery and pantry orders above ₹299</p>
                <div className="coupon-code">No coupon required • Auto-applied</div>
              </div>
              <img
                src="https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80"
                alt="Grains & Dal"
                className="banner-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Product Carousels */}
      <div className="container home-carousels-container">
        {/* Daily Essentials */}
        <ProductCarousel
          title="Daily Essentials"
          subtitle="Milk, bread, butter, fresh eggs & daily staples"
          viewAllLink="/category/dairy-breakfast"
          products={dailyEssentials}
        />

        {/* Fresh Picks */}
        <ProductCarousel
          title="Farm Fresh Picks"
          subtitle="Hand-picked seasonal fruits and crispy vegetables"
          viewAllLink="/category/fruits-vegetables"
          products={freshPicks}
        />

        {/* Most Bought */}
        <ProductCarousel
          title="Most Bought in Noida"
          subtitle="Popular staples ordered by thousands of neighbors today"
          viewAllLink="/offers"
          products={mostBought}
        />

        {/* Under ₹99 Budget Store */}
        <ProductCarousel
          title="Under ₹99 Express Store"
          subtitle="Snacks, soft drinks, daily staples and pocket-friendly treats"
          viewAllLink="/offers"
          products={under99}
        />

        {/* Best Deals */}
        <ProductCarousel
          title="Best Deals & Discounts"
          subtitle="Big savings on household detergents, flours, oils and personal care"
          viewAllLink="/offers"
          products={bestDeals}
        />
      </div>
    </div>
  );
};
