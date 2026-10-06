import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useLocation } from '@/context/LocationContext';
import { Button } from '@/components/ui/Button';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  Heart
} from 'lucide-react';
import './CartPage.scss';

export const CartPage = () => {
  const { items, totalQuantity, billSummary, updateQuantity, removeItem, clearCart } = useCart();
  const { selectedLocation, setLocationModalOpen } = useLocation();
  const navigate = useNavigate();

  const [deliveryTip, setDeliveryTip] = useState(0);

  const tips = [10, 20, 30, 50];
  const finalGrandTotal = billSummary.grandTotal + deliveryTip;

  if (items.length === 0) {
    return (
      <div className="pmart-cart-empty-page">
        <div className="container">
          <div className="empty-cart-card">
            <div className="empty-icon-wrap">
              <ShoppingBag size={54} />
            </div>
            <h2>Your cart is empty</h2>
            <p>You haven't added anything to your cart yet. Explore our fresh fruits, vegetables, and daily staples.</p>
            <Button component={Link} to="/category/fruits-vegetables" variant="primary" size="lg" className="mt-4">
              Browse Fresh Groceries
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pmart-cart-page">
      <div className="container">
        <div className="cart-page-header">
          <h1 className="page-heading">Your Shopping Cart</h1>
          <span className="items-counter">{totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}</span>
        </div>

        <div className="cart-two-column-layout">
          {/* Left: Products & Delivery Destination */}
          <div className="cart-left-col">
            {/* Delivery Location Strip */}
            <div className="delivery-destination-card">
              <div className="dest-left">
                <div className="dest-icon">
                  <MapPin size={20} />
                </div>
                <div className="dest-details">
                  <div className="dest-title">
                    <span>Delivering to <strong>{selectedLocation?.tag}</strong></span>
                    <span className="eta-badge">EXPRESS</span>
                  </div>
                  <div className="dest-address">{selectedLocation?.address}</div>
                </div>
              </div>
              <button className="change-btn" onClick={() => setLocationModalOpen(true)}>
                Change
              </button>
            </div>

            {/* Cart Items List */}
            <div className="cart-products-list-card">
              <div className="list-card-header">
                <span className="header-label">ITEMS IN YOUR BASKET</span>
                <button className="clear-cart-text-btn" onClick={clearCart}>
                  Clear all
                </button>
              </div>

              <div className="items-table">
                {items.map((item) => (
                  <div key={item._id || item.id} className="cart-item-table-row">
                    <img src={item.imageUrl || item.image} alt={item.name} className="product-thumb" />

                    <div className="product-meta">
                      <h4 className="name">{item.name}</h4>
                      <span className="unit">{item.unit}</span>
                      <div className="price-tag">
                        <span className="current">₹{item.price}</span>
                        {item.mrp > item.price && (
                          <span className="mrp">₹{item.mrp}</span>
                        )}
                      </div>
                    </div>

                    <div className="stepper-wrap">
                      <div className="cart-page-stepper">
                        <button
                          className="step-btn"
                          onClick={() => updateQuantity(item._id || item.id, item.quantity - 1)}
                          aria-label="Decrease"
                        >
                          {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                        </button>
                        <span className="step-val">{item.quantity}</span>
                        <button
                          className="step-btn"
                          onClick={() => updateQuantity(item._id || item.id, item.quantity + 1)}
                          aria-label="Increase"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <div className="row-item-total">
                        ₹{item.price * item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Partner Tip */}
            <div className="partner-tip-card">
              <div className="tip-header">
                <Heart size={18} className="heart-icon" />
                <div>
                  <div className="tip-title">Say thanks with a tip to your delivery hero</div>
                  <div className="tip-sub">100% of the tip goes directly to your delivery partner</div>
                </div>
              </div>
              <div className="tip-pills-row">
                {tips.map((t) => (
                  <button
                    key={t}
                    className={`tip-pill ${deliveryTip === t ? 'active' : ''}`}
                    onClick={() => setDeliveryTip(deliveryTip === t ? 0 : t)}
                  >
                    +₹{t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Bill Details & Checkout CTA */}
          <div className="cart-right-col">
            <div className="bill-summary-card">
              <h3 className="summary-title">Bill Summary</h3>

              <div className="bill-line">
                <span>Item Total</span>
                <span>₹{billSummary.itemTotal}</span>
              </div>

              <div className="bill-line">
                <span>Delivery Partner Fee</span>
                <span>
                  {billSummary.deliveryFee === 0 ? (
                    <span className="text-free">FREE</span>
                  ) : (
                    `₹${billSummary.deliveryFee}`
                  )}
                </span>
              </div>

              <div className="bill-line">
                <span>Handling & Platform Fee</span>
                <span>₹{billSummary.platformFee}</span>
              </div>

              {deliveryTip > 0 && (
                <div className="bill-line">
                  <span>Delivery Partner Tip</span>
                  <span>₹{deliveryTip}</span>
                </div>
              )}

              {billSummary.savings > 0 && (
                <div className="bill-line savings-line">
                  <span>Total Discount Savings</span>
                  <span className="savings-val">-₹{billSummary.savings}</span>
                </div>
              )}

              <div className="bill-separator" />

              <div className="bill-line grand-total-line">
                <span>To Pay</span>
                <span className="grand-amt">₹{finalGrandTotal}</span>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="btn-full checkout-action-btn"
                onClick={() => navigate('/checkout')}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} />
              </Button>

              <div className="cancellation-policy-note">
                <ShieldCheck size={14} className="shield" />
                <span>Orders are safely packed & delivered fast</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
