import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './CartDrawer.scss';

export const CartDrawer = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    items,
    totalQuantity,
    billSummary,
    updateQuantity,
    removeItem
  } = useCart();

  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const handleViewCart = () => {
    setIsCartOpen(false);
    navigate('/cart');
  };

  const freeDeliveryThreshold = 299;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - billSummary.itemTotal);

  return (
    <AnimatePresence>
      <div className="drawer-overlay" onClick={() => setIsCartOpen(false)}>
        <motion.div
          className="drawer-content cart-drawer"
          onClick={(e) => e.stopPropagation()}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="drawer-header">
            <div className="header-title-group">
              <h3 className="cart-title">My Cart</h3>
              {totalQuantity > 0 && (
                <span className="items-count-badge">{totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}</span>
              )}
            </div>
            <button
              className="close-drawer-btn"
              onClick={() => setIsCartOpen(false)}
              aria-label="Close Cart"
            >
              <X size={20} />
            </button>
          </div>

          {items.length === 0 ? (
            /* Empty State */
            <div className="cart-empty-state">
              <div className="empty-icon-wrap">
                <ShoppingBag size={48} className="empty-cart-icon" />
              </div>
              <h4 className="empty-title">Your cart is empty</h4>
              <p className="empty-desc">
                Looks like you haven't added anything yet. Explore farm-fresh produce and daily grocery essentials!
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/category/fruits-vegetables');
                }}
              >
                Browse Fresh Groceries
              </button>
            </div>
          ) : (
            <>
              {/* Free Delivery Bar */}
              <div className="delivery-threshold-banner">
                {remainingForFreeDelivery > 0 ? (
                  <div className="threshold-msg">
                    <Zap size={15} className="zap-icon" />
                    <span>
                      Add <strong>₹{remainingForFreeDelivery}</strong> more to unlock <strong>FREE Delivery</strong>!
                    </span>
                  </div>
                ) : (
                  <div className="threshold-msg unlocked">
                    <ShieldCheck size={15} />
                    <span>Congratulations! You unlocked <strong>FREE Delivery</strong>!</span>
                  </div>
                )}
                <div className="threshold-progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, (billSummary.itemTotal / freeDeliveryThreshold) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="cart-items-scroll">
                {items.map((item) => (
                  <div key={item._id || item.id} className="cart-item-row">
                    <img src={item.imageUrl || item.image} alt={item.name} className="item-thumb" />

                    <div className="item-details">
                      <div className="item-name">{item.name}</div>
                      <div className="item-unit">{item.unit}</div>
                      <div className="item-price-row">
                        <span className="current-price">₹{item.price}</span>
                        {item.mrp > item.price && (
                          <span className="mrp-price">₹{item.mrp}</span>
                        )}
                      </div>
                    </div>

                    <div className="item-qty-actions">
                      <div className="qty-control-pill">
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item._id || item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                        </button>
                        <span className="qty-number">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item._id || item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill Summary */}
              <div className="cart-bill-section">
                <div className="bill-title">Bill Details</div>

                <div className="bill-row">
                  <span>Item Total</span>
                  <span>₹{billSummary.itemTotal}</span>
                </div>

                <div className="bill-row">
                  <span>Delivery Partner Fee</span>
                  <span>
                    {billSummary.deliveryFee === 0 ? (
                      <span className="free-text">FREE</span>
                    ) : (
                      `₹${billSummary.deliveryFee}`
                    )}
                  </span>
                </div>

                <div className="bill-row">
                  <span>Handling & Platform Fee</span>
                  <span>₹{billSummary.platformFee}</span>
                </div>

                {billSummary.savings > 0 && (
                  <div className="bill-row savings-row">
                    <span>Total Discount Savings</span>
                    <span className="savings-amt">-₹{billSummary.savings}</span>
                  </div>
                )}

                <div className="bill-divider" />

                <div className="bill-row total-row">
                  <span>Grand Total</span>
                  <span className="grand-total-amt">₹{billSummary.grandTotal}</span>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="drawer-footer">
                <button className="btn btn-primary btn-full checkout-cta" onClick={handleCheckout}>
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={17} />
                </button>
                <button className="btn btn-secondary btn-full view-cart-link" onClick={handleViewCart}>
                  View Full Cart
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
