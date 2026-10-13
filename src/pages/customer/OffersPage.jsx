import React, { useState, useEffect } from 'react';
import { productService } from '@/services/productService';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/product/ProductCard';
import { Percent, Tag } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/ui';
import './OffersPage.scss';

/** Lists products currently sold below MRP, biggest discount first. There are no coupon codes. */
export const OffersPage = () => {
  const { settings } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService
      .getProducts({ sort: 'discount', limit: 60 })
      .then((res) => setProducts((res?.products || []).filter((p) => p.discount > 0)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pmart-offers-page">
      <div className="container">
        <div className="offers-hero-card">
          <div className="hero-text">
            <span className="hero-tag">DEALS</span>
            <h1 className="hero-title">Today's price drops</h1>
            <p className="hero-desc">
              Products currently priced below MRP.
              {settings.freeDeliveryThreshold > 0 && ` Delivery is free on orders above ₹${settings.freeDeliveryThreshold}.`}
            </p>
          </div>
          <div className="hero-badge-art">
            <Percent size={64} className="percent-icon" />
          </div>
        </div>

        <section className="offers-products-section">
          {loading ? (
            <LoadingState text="Loading deals..." />
          ) : products.length === 0 ? (
            <EmptyState icon={Tag} title="No deals right now" description="Discounted products will show up here when the store marks prices below MRP." />
          ) : (
            <div className="offers-grid">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
