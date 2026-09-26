import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mockCategories } from '@/data/mockCategories';
import { productService } from '@/services/productService';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { ShieldCheck, ArrowRight, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import heroBgImage from '@/assets/hero-bg.png';
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
      {/* Hero Promotional Banner Section (Full-Width Immersive Design) */}
      <section className="home-hero-section full-width-hero">
        <div className="hero-banner-card">
          {/* Full Width Edge-to-Edge Image Media Backdrop */}
          <div className="hero-backdrop-media">
            <img
              src={heroBgImage}
              alt="Fresh Groceries Delivered Fast"
              className="hero-grocery-img"
            />
            <div className="hero-gradient-overlay" />
          </div>

          <div className="hero-container-inner">
            <div className="hero-text-content">
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
          </div>
        </div>
      </section>

      {/* Category Strip */}
      <section className="home-categories-section">
        <div className="container">
          <div className="section-header-row">
            <h2 className="section-heading">Explore Categories</h2>
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
          viewAllLink="/category/dairy-breakfast"
          products={dailyEssentials}
        />

        {/* Fresh Picks */}
        <ProductCarousel
          title="Farm Fresh Picks"
          viewAllLink="/category/fruits-vegetables"
          products={freshPicks}
        />

        {/* Most Bought */}
        <ProductCarousel
          title="Most Bought in Noida"
          viewAllLink="/offers"
          products={mostBought}
        />

        {/* Under ₹99 Budget Store */}
        <ProductCarousel
          title="Under ₹99 Express Store"
          viewAllLink="/offers"
          products={under99}
        />

        {/* Best Deals */}
        <ProductCarousel
          title="Best Deals & Discounts"
          viewAllLink="/offers"
          products={bestDeals}
        />
      </div>
    </div>
  );
};
