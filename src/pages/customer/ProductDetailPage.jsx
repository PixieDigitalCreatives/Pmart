import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productService } from '@/services/productService';
import { useCart } from '@/context/CartContext';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import {
  Clock,
  Star,
  ShieldCheck,
  RotateCcw,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  Share2,
  Check
} from 'lucide-react';
import './ProductDetailPage.scss';

export const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, getItemQuantity, updateQuantity, setIsCartOpen } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      try {
        const prod = await productService.getProductBySlug(slug);
        setProduct(prod);
        setSelectedImage(prod.imageUrl || prod.image);

        // Fetch related products in the same category
        const rel = await productService.getProducts({ category: prod.categorySlug, limit: 6 });
        setRelatedProducts(rel.products.filter(p => (p._id || p.id) !== (prod._id || prod.id)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  if (loading) {
    return (
      <div className="container py-12 text-center">
        <p>Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-12 text-center">
        <h3>Product not found</h3>
        <Link to="/" className="btn btn-primary mt-4">Back to Shop</Link>
      </div>
    );
  }

  const currentCartQty = getItemQuantity(product._id || product.id);

  const handleAddToCart = () => {
    addItem(product, 1);
  };

  const handleBuyNow = () => {
    if (currentCartQty === 0) {
      addItem(product, 1);
    }
    navigate('/checkout');
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="pmart-product-detail-page">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={14} className="separator" />
          <Link to={`/category/${product.categorySlug}`}>
            {product.categorySlug.replace('-', ' ')}
          </Link>
          <ChevronRight size={14} className="separator" />
          <span className="current-crumb">{product.name}</span>
        </nav>

        {/* Top Product Showcase Grid */}
        <div className="pdp-main-grid">
          {/* Left: Gallery */}
          <div className="pdp-gallery-column">
            <div className="main-image-display">
              <img src={selectedImage} alt={product.name} className="hero-img" />
              {product.discount > 0 && (
                <div className="discount-tag">{product.discount}% OFF</div>
              )}
            </div>

            {product.gallery && product.gallery.length > 1 && (
              <div className="thumbnail-row">
                <button
                  className={`thumb-btn ${selectedImage === (product.imageUrl || product.image) ? 'active' : ''}`}
                  onClick={() => setSelectedImage(product.imageUrl || product.image)}
                >
                  <img src={product.imageUrl || product.image} alt={product.name} />
                </button>
                {product.gallery.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    className={`thumb-btn ${selectedImage === imgUrl ? 'active' : ''}`}
                    onClick={() => setSelectedImage(imgUrl)}
                  >
                    <img src={imgUrl} alt={`${product.name} ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info & Purchase Controls */}
          <div className="pdp-info-column">
            <div className="brand-share-row">
              <span className="brand-label">{product.brand}</span>
              <button className="share-btn" onClick={handleShare} title="Share product link">
                {copiedLink ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
                <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
              </button>
            </div>

            <h1 className="pdp-product-title">{product.name}</h1>

            {/* Rating & Fast Delivery Pill */}
            <div className="meta-strip">
              {product.rating && (
                <div className="rating-pill">
                  <Star size={13} className="star-icon" />
                  <span className="val">{product.rating}</span>
                  <span className="reviews">({product.reviewsCount} verified reviews)</span>
                </div>
              )}
              <div className="eta-pill">
                <Clock size={13} />
                <span>Express Superfast Delivery</span>
              </div>
            </div>

            {/* Price & Unit */}
            <div className="price-unit-card">
              <div className="unit-label">Pack size: <strong>{product.unit}</strong></div>
              <div className="price-display-row">
                <span className="selling-price">₹{product.price}</span>
                {product.mrp > product.price && (
                  <>
                    <span className="mrp-price">MRP ₹{product.mrp}</span>
                    <span className="discount-badge">Save ₹{product.mrp - product.price}</span>
                  </>
                )}
              </div>
              <span className="tax-inclusive-note">(Inclusive of all applicable taxes)</span>
            </div>

            {/* Quantity & CTA Buttons */}
            <div className="purchase-action-container">
              {product.stockCount <= 0 ? (
                <div className="out-of-stock-alert" style={{ width: '100%', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
                  Out of Stock
                </div>
              ) : currentCartQty === 0 ? (
                <button className="btn btn-primary btn-lg add-to-cart-cta" onClick={handleAddToCart}>
                  <ShoppingBag size={18} />
                  <span>ADD TO CART</span>
                </button>
              ) : (
                <div className="qty-stepper-box">
                  <span className="qty-label">Quantity in Cart:</span>
                  <div className="stepper-controls">
                    <button
                      className="step-btn"
                      onClick={() => updateQuantity(product._id || product.id, currentCartQty - 1)}
                    >
                      <Minus size={15} />
                    </button>
                    <span className="step-val">{currentCartQty}</span>
                    <button
                      className="step-btn"
                      onClick={() => updateQuantity(product._id || product.id, currentCartQty + 1)}
                      disabled={currentCartQty >= product.stockCount}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              )}

              <button 
                className="btn btn-dark btn-lg buy-now-cta" 
                onClick={handleBuyNow}
                disabled={product.stockCount <= 0}
              >
                <span>BUY NOW</span>
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Value Guarantees */}
            <div className="product-assurances">
              <div className="assurance-item">
                <ShieldCheck size={18} className="assure-icon" />
                <div>
                  <div className="item-title">100% Original Produce</div>
                  <div className="item-sub">Directly sourced from trusted partner brands</div>
                </div>
              </div>
              <div className="assurance-item">
                <RotateCcw size={18} className="assure-icon" />
                <div>
                  <div className="item-title">Easy Replacement</div>
                  <div className="item-sub">Instant doorstep refund if damaged or missing</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information Tabs / Tables */}
        <div className="pdp-details-section">
          <div className="details-card">
            <h3 className="section-title">Product Description</h3>
            <p className="description-text">{product.description}</p>

            {/* Specifications */}
            {product.specifications && (
              <div className="specs-block">
                <h4 className="specs-title">Key Specifications</h4>
                <div className="specs-table">
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="spec-row">
                      <span className="spec-key">{key}</span>
                      <span className="spec-val">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nutrition */}
            {product.nutrition && Object.keys(product.nutrition).length > 0 && (
              <div className="nutrition-block">
                <h4 className="specs-title">Nutritional Information</h4>
                <div className="specs-table">
                  {Object.entries(product.nutrition).map(([nutrient, val]) => (
                    <div key={nutrient} className="spec-row">
                      <span className="spec-key">{nutrient}</span>
                      <span className="spec-val">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Carousel */}
        {relatedProducts.length > 0 && (
          <div className="pdp-related-section">
            <ProductCarousel
              title="Customers Also Bought"
              subtitle={`More essentials from ${product.categorySlug.replace('-', ' ')}`}
              products={relatedProducts}
            />
          </div>
        )}
      </div>
    </div>
  );
};
