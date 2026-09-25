import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './ProductCard';
import './ProductCarousel.scss';

export const ProductCarousel = ({ title, subtitle, viewAllLink, products = [] }) => {
  const scrollRef = useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="pmart-product-carousel-section">
      <div className="carousel-header">
        <div className="header-titles">
          <h3 className="section-heading">{title}</h3>
          {subtitle && <p className="section-subtext">{subtitle}</p>}
        </div>

        <div className="carousel-controls">
          {viewAllLink && (
            <Link to={viewAllLink} className="view-all-link">
              see all
            </Link>
          )}
          <div className="arrow-nav-group">
            <button
              className="nav-arrow-btn"
              onClick={() => handleScroll('left')}
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="nav-arrow-btn"
              onClick={() => handleScroll('right')}
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="carousel-track" ref={scrollRef}>
        {products.map((product) => (
          <div key={product.id} className="carousel-slide">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
};
