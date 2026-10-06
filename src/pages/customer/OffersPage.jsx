import React, { useState, useEffect } from 'react';
import { productService } from '@/services/productService';
import { ProductCard } from '@/components/product/ProductCard';
import { Tag, Sparkles, Zap, Percent, Gift, Copy, Check } from 'lucide-react';
import './OffersPage.scss';
import { Button } from '@/components/ui';

export const OffersPage = () => {
  const [dealProducts, setDealProducts] = useState([]);
  const [under99Products, setUnder99Products] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    const loadOffers = async () => {
      const deals = await productService.getProductsByTag('best-deals', 8);
      const u99 = await productService.getProductsByTag('under-99', 8);
      setDealProducts(deals);
      setUnder99Products(u99);
    };

    loadOffers();
  }, []);

  const coupons = [
    { code: 'PMART100', discount: 'Flat ₹100 OFF', desc: 'On orders above ₹499 for fresh groceries', expiry: 'Expires in 3 days' },
    { code: 'FREEDEL', discount: 'Free Express Delivery', desc: 'No delivery fee on any order above ₹199', expiry: 'Valid today only' },
    { code: 'DAIRY20', discount: '20% OFF on Dairy & Breakfast', desc: 'Valid on Amul, Mother Dairy & Epigamia', expiry: 'Limited slots' }
  ];

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="pmart-offers-page">
      <div className="container">
        {/* Offers Hero Header */}
        <div className="offers-hero-card">
          <div className="hero-text">
            <span className="hero-tag">DEALS & SAVINGS CORNER</span>
            <h1 className="hero-title">Big Savings On Everyday Grocery</h1>
            <p className="hero-desc">
              Discover verified discounts, bank offers, combo deals, and budget-friendly groceries updated every morning.
            </p>
          </div>
          <div className="hero-badge-art">
            <Percent size={64} className="percent-icon" />
          </div>
        </div>

        {/* Coupons Strip */}
        <section className="coupons-section">
          <h2 className="section-title">Available Coupons & Vouchers</h2>
          <div className="coupons-grid">
            {coupons.map((coupon, i) => (
              <div key={i} className="coupon-ticket">
                <div className="ticket-left">
                  <div className="discount-val">{coupon.discount}</div>
                  <div className="coupon-desc">{coupon.desc}</div>
                  <div className="expiry-tag">{coupon.expiry}</div>
                </div>
                <div className="ticket-divider" />
                <div className="ticket-right">
                  <div className="code-pill">{coupon.code}</div>
                  <Button
                    className="copy-btn"
                    onClick={() => handleCopyCode(coupon.code)}
                  >
                    {copiedCode === coupon.code ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedCode === coupon.code ? 'Copied' : 'Apply'}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Today's Best Deals Grid */}
        <section className="offers-products-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Today's Best Deals & Price Drops</h2>
              <p className="section-desc">Up to 30% discount on pantry staples, oils and personal hygiene</p>
            </div>
          </div>
          <div className="offers-grid">
            {dealProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Under ₹99 Budget Corner */}
        <section className="offers-products-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Under ₹99 Budget Store</h2>
              <p className="section-desc">Everyday essentials, snacks, soft drinks & chocolates under ₹99</p>
            </div>
          </div>
          <div className="offers-grid">
            {under99Products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
