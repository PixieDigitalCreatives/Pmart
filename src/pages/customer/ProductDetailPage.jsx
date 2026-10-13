import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productService } from '@/services/productService';
import { useCart } from '@/context/CartContext';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { Plus, Minus, ShoppingBag, ArrowRight, ChevronRight, Share2, Check, Package, Store } from 'lucide-react';
import { Button, EmptyState, LoadingState } from '@/components/ui';
import './ProductDetailPage.scss';

export const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, getItemQuantity, updateQuantity } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productService
      .getProductBySlug(slug)
      .then(async (p) => {
        if (cancelled) return;
        setProduct(p);
        setSelectedImage(p.imageUrl || '');
        const rel = await productService.getProducts({ category: p.categorySlug, limit: 12 });
        if (!cancelled) setRelated(rel.products.filter((r) => r._id !== p._id));
      })
      .catch(() => !cancelled && setProduct(null))
      .finally(() => !cancelled && setLoading(false));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <LoadingState text="Loading product..." />;

  if (!product) {
    return (
      <div className="container py-12">
        <EmptyState icon={Package} title="Product not found" description="It may be out of the catalog." action={<Button component={Link} to="/" variant="primary">Back to shop</Button>} />
      </div>
    );
  }

  const quantity = getItemQuantity(product._id);
  const outOfStock = product.stockCount <= 0;
  const storePaused = product.shop && product.shop.isAcceptingOrders === false;
  const images = [product.imageUrl, ...(product.gallery || [])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  const specs = Object.entries(product.specifications || {});
  const nutrition = Object.entries(product.nutrition || {});

  const share = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pmart-product-detail-page">
      <div className="container">
        <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={14} className="separator" />
          <Link to={`/category/${product.categorySlug}`}>{product.category?.name || 'Category'}</Link>
          <ChevronRight size={14} className="separator" />
          <span className="current-crumb">{product.name}</span>
        </nav>

        <div className="pdp-main-grid">
          <div className="pdp-gallery-column">
            <div className="main-image-display">
              {selectedImage ? <img src={selectedImage} alt={product.name} className="hero-img" /> : <Package size={96} className="text-gray-400" aria-hidden="true" />}
              {product.discount > 0 && <div className="discount-tag">{product.discount}% OFF</div>}
            </div>
            {images.length > 1 && (
              <div className="thumbnail-row">
                {images.map((url, idx) => (
                  <Button key={url} className={`thumb-btn ${selectedImage === url ? 'active' : ''}`} onClick={() => setSelectedImage(url)}>
                    <img src={url} alt={`${product.name} ${idx + 1}`} />
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="pdp-info-column">
            <div className="brand-share-row">
              <span className="brand-label">{product.brand}</span>
              <Button className="share-btn" onClick={share} title="Copy link">
                {copied ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
                <span>{copied ? 'Link copied' : 'Share'}</span>
              </Button>
            </div>

            <h1 className="pdp-product-title">{product.name}</h1>
            {product.shop?.name && (
              <div className="meta-strip">
                <div className="eta-pill">
                  <Store size={13} />
                  <span>Sold by {product.shop.name}</span>
                </div>
              </div>
            )}

            <div className="price-unit-card">
              <div className="unit-label">
                Pack size: <strong>{product.unit}</strong>
              </div>
              <div className="price-display-row">
                <span className="selling-price">₹{product.price}</span>
                {product.mrp > product.price && (
                  <>
                    <span className="mrp-price">MRP ₹{product.mrp}</span>
                    <span className="discount-badge">Save ₹{Math.round((product.mrp - product.price) * 100) / 100}</span>
                  </>
                )}
              </div>
              <span className="tax-inclusive-note">(Inclusive of all taxes)</span>
            </div>

            <div className="purchase-action-container">
              {outOfStock ? (
                <div className="alert alert-error" style={{ width: '100%', justifyContent: 'center' }}>Out of stock</div>
              ) : quantity === 0 ? (
                <Button variant="primary" size="lg" className="add-to-cart-cta" onClick={() => addItem(product, 1)} disabled={storePaused}>
                  <ShoppingBag size={18} />
                  <span>Add to cart</span>
                </Button>
              ) : (
                <div className="qty-stepper-box">
                  <span className="qty-label">In your cart:</span>
                  <div className="stepper-controls">
                    <Button className="step-btn" onClick={() => updateQuantity(product._id, quantity - 1)} aria-label="Decrease quantity">
                      <Minus size={15} />
                    </Button>
                    <span className="step-val">{quantity}</span>
                    <Button className="step-btn" onClick={() => updateQuantity(product._id, quantity + 1)} disabled={quantity >= product.stockCount} aria-label="Increase quantity">
                      <Plus size={15} />
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="dark"
                size="lg"
                className="buy-now-cta"
                onClick={() => {
                  if (quantity === 0) addItem(product, 1);
                  navigate('/checkout');
                }}
                disabled={outOfStock || storePaused}
              >
                <span>Buy now</span>
                <ArrowRight size={18} />
              </Button>
            </div>
            {storePaused && <div className="alert alert-warning mt-3">This store is not accepting orders right now.</div>}
            {!outOfStock && product.stockCount <= 5 && <p className="muted-note mt-2">Only {product.stockCount} left in stock.</p>}
          </div>
        </div>

        {(product.description || specs.length > 0 || nutrition.length > 0) && (
          <div className="pdp-details-section">
            <div className="details-card">
              {product.description && (
                <>
                  <h3 className="section-title">Description</h3>
                  <p className="description-text">{product.description}</p>
                </>
              )}
              {specs.length > 0 && (
                <div className="specs-block">
                  <h4 className="specs-title">Specifications</h4>
                  <div className="specs-table">
                    {specs.map(([k, v]) => (
                      <div key={k} className="spec-row">
                        <span className="spec-key">{k}</span>
                        <span className="spec-val">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nutrition.length > 0 && (
                <div className="nutrition-block">
                  <h4 className="specs-title">Nutrition</h4>
                  <div className="specs-table">
                    {nutrition.map(([k, v]) => (
                      <div key={k} className="spec-row">
                        <span className="spec-key">{k}</span>
                        <span className="spec-val">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div className="pdp-related-section">
            <ProductCarousel title="More from this category" products={related} />
          </div>
        )}
      </div>
    </div>
  );
};
