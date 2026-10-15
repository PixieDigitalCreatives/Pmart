import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Plus, Minus, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import './ProductCard.scss';


function getThumbnailUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('images.unsplash.com')) {
    return url.replace(/w=\d+/, 'w=360').replace(/q=\d+/, 'q=75');
  }
  return url;
}

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { getItemQuantity, addItem, updateQuantity } = useCart();

  const quantity = getItemQuantity(product._id || product.id);

  const handleCardClick = () => {
    navigate(`/product/${product.slug}`);
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem(product, 1);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    updateQuantity(product._id || product.id, quantity + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    updateQuantity(product._id || product.id, quantity - 1);
  };

  return (
    <div className="pmart-product-card" onClick={handleCardClick}>
      {/* Top Media & Badges */}
      <div className="card-media-wrapper">
        {product.imageUrl ? (
          <img
            src={getThumbnailUrl(product.imageUrl)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            width="180"
            height="180"
            className="product-img"
          />
        ) : (
          <div className="product-img product-img-placeholder" aria-hidden="true">
            <Package size={36} />
          </div>
        )}

        {/* Discount Badge */}
        {product.discount > 0 && (
          <div className="card-discount-badge">
            {product.discount}% OFF
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="card-content">
        <div className="product-unit">{product.unit}</div>
        <h4 className="product-title" title={product.name}>
          {product.name}
        </h4>

        {/* Bottom: Price & Add Button */}
        <div className="card-bottom">
          <div className="price-block">
            <span className="selling-price">₹{product.price}</span>
            {product.mrp > product.price && <span className="mrp-price">₹{product.mrp}</span>}
          </div>

          <div className="action-block">
            {product.stockCount <= 0 ? (
              <div className="out-of-stock-text" style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                Out of stock
              </div>
            ) : quantity === 0 ? (
              <button
                className="btn-add-to-cart"
                onClick={handleAdd}
                aria-label={`Add ${product.name} to cart`}
              >
                <span>ADD</span>
                <Plus size={14} />
              </button>
            ) : (
              <motion.div
                className="quantity-stepper"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="step-btn"
                  onClick={handleDecrement}
                  aria-label="Decrease quantity"
                >
                  <Minus size={13} />
                </button>
                <span className="step-qty">{quantity}</span>
                <button
                  className="step-btn"
                  onClick={handleIncrement}
                  aria-label="Increase quantity"
                  disabled={quantity >= product.stockCount}
                >
                  <Plus size={13} />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
