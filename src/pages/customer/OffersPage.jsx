import React, { useState, useEffect } from 'react';
import { productService } from '@/services/productService';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/product/ProductCard';
import { TbPercentage as Percent, TbTag as Tag } from 'react-icons/tb';
import { EmptyState, LoadingState, Button } from '@/components/ui';
import './OffersPage.scss';

const PAGE_SIZE = 24;

/** Lists products currently sold below MRP, biggest discount first. There are no coupon codes. */
export const OffersPage = () => {
  const { settings } = useCart();
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    productService
      .getProducts({ sort: 'discount', limit: PAGE_SIZE, hasDiscount: 'true', page: 1 }, controller.signal)
      .then((res) => {
        setProducts(res.products || []);
        setTotalCount(res.totalCount || 0);
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
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    try {
      const res = await productService.getProducts({
        sort: 'discount',
        limit: PAGE_SIZE,
        hasDiscount: 'true',
        page: next
      });
      setProducts((prev) => [...prev, ...(res.products || [])]);
      setPage(next);
    } catch {
      // keep existing
    } finally {
      setLoadingMore(false);
    }
  };

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
            <>
              <div className="offers-grid">
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
        </section>
      </div>
    </div>
  );
};
