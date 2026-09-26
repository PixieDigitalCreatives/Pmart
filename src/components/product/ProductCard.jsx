import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Plus, Minus, Clock, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import './ProductCard.scss';

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { getItemQuantity, addItem, updateQuantity } = useCart();

  const quantity = getItemQuantity(product.id);

  const handleCardClick = () => {
    navigate(`/product/${product.slug}`);
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem(product, 1);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    updateQuantity(product.id, quantity + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    updateQuantity(product.id, quantity - 1);
  };

  return (
    <div className="pmart-product-card" onClick={handleCardClick}>
      {/* Top Media & Badges */}
      <div className="card-media-wrapper">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="product-img"
        />

        {/* ETA Badge */}
        <div className="card-eta-badge">
          <Clock size={11} />
          <span>{product.deliveryTime && !product.deliveryTime.includes('10') ? product.deliveryTime : 'EXPRESS'}</span>
        </div>

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

        {/* Rating if present */}
        {product.rating && (
          <div className="product-rating">
            <Star size={12} className="star-icon" />
            <span className="rating-val">{product.rating}</span>
            <span className="rating-count">({product.reviewsCount})</span>
          </div>
        )}

        {/* Bottom: Price & Add Button */}
        <div className="card-bottom">
          <div className="price-block">
            <span className="selling-price">₹{product.price}</span>
            {product.mrp > product.price && (
              <span className="mrp-price">₹{product.mrp}</span>
            )}
          </div>

          <div className="action-block">
            {quantity === 0 ? (
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
