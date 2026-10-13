import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useLocation } from '@/context/LocationContext';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui';
import { getFullAddressString } from '@/utils/addressUtils';
import './CartPage.scss';

export const CartPage = () => {
  const { items, totalQuantity, billSummary, updateQuantity, clearCart, syncNotice, clearSyncNotice } = useCart();
  const { selectedLocation, setLocationModalOpen } = useLocation();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="pmart-cart-empty-page">
        <div className="container">
          <div className="empty-cart-card">
            <div className="empty-icon-wrap">
              <ShoppingBag size={54} />
            </div>
            <h2>Your cart is empty</h2>
            <p>Add products from the store to see them here.</p>
            <Button component={Link} to="/" variant="primary" size="lg" className="mt-4">
              Start shopping
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
          <h1 className="page-heading">Your cart</h1>
          <span className="items-counter">
            {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
          </span>
        </div>

        {syncNotice && (
          <div className="alert alert-warning mb-4" role="status">
            <span>{syncNotice}</span>
            <button type="button" className="ml-auto" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={clearSyncNotice}>
              Dismiss
            </button>
          </div>
        )}

        <div className="cart-two-column-layout">
          <div className="cart-left-col">
            <div className="delivery-destination-card">
              <div className="dest-left">
                <div className="dest-icon">
                  <MapPin size={20} />
                </div>
                <div className="dest-details">
                  <div className="dest-title">
                    <span>
                      Delivering to <strong>{selectedLocation ? selectedLocation.tag : 'no address selected'}</strong>
                    </span>
                  </div>
                  {selectedLocation && <div className="dest-address">{getFullAddressString(selectedLocation)}</div>}
                </div>
              </div>
              <Button className="change-btn" onClick={() => setLocationModalOpen(true)}>
                {selectedLocation ? 'Change' : 'Select'}
              </Button>
            </div>

            <div className="cart-products-list-card">
              <div className="list-card-header">
                <span className="header-label">ITEMS IN YOUR CART</span>
                <Button className="clear-cart-text-btn" onClick={clearCart}>
                  Clear all
                </Button>
              </div>
              <div className="items-table">
                {items.map((item) => (
                  <div key={item.id} className="cart-item-table-row">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="product-thumb" />
                    ) : (
                      <div className="product-thumb flex items-center justify-center text-gray-400">
                        <Package size={22} />
                      </div>
                    )}
                    <div className="product-meta">
                      <Link to={`/product/${item.slug}`} className="name">
                        {item.name}
                      </Link>
                      <span className="unit">{item.unit}</span>
                      <div className="price-tag">
                        <span className="current">₹{item.price}</span>
                        {item.mrp > item.price && <span className="mrp">₹{item.mrp}</span>}
                      </div>
                    </div>
                    <div className="stepper-wrap">
                      <div className="cart-page-stepper">
                        <Button className="step-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease">
                          {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                        </Button>
                        <span className="step-val">{item.quantity}</span>
                        <Button
                          className="step-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.stockCount != null && item.quantity >= item.stockCount}
                          aria-label="Increase"
                        >
                          <Plus size={13} />
                        </Button>
                      </div>
                      <div className="row-item-total">₹{Math.round(item.price * item.quantity * 100) / 100}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="cart-right-col">
            <div className="bill-summary-card">
              <h3 className="summary-title">Bill summary</h3>
              <div className="bill-line">
                <span>Item total</span>
                <span>₹{billSummary.itemTotal}</span>
              </div>
              <div className="bill-line">
                <span>Delivery fee</span>
                <span>{billSummary.deliveryFee === 0 ? <span className="text-free">FREE</span> : `₹${billSummary.deliveryFee}`}</span>
              </div>
              {billSummary.platformFee > 0 && (
                <div className="bill-line">
                  <span>Handling fee</span>
                  <span>₹{billSummary.platformFee}</span>
                </div>
              )}
              {billSummary.savings > 0 && (
                <div className="bill-line savings-line">
                  <span>You save on MRP</span>
                  <span className="savings-val">₹{billSummary.savings}</span>
                </div>
              )}
              {billSummary.amountToFreeDelivery > 0 && (
                <p className="muted-note mt-2">Add ₹{billSummary.amountToFreeDelivery} more for free delivery.</p>
              )}
              <div className="bill-separator" />
              <div className="bill-line grand-total-line">
                <span>To pay</span>
                <span className="grand-amt">₹{billSummary.grandTotal}</span>
              </div>
              <Button variant="primary" size="lg" className="checkout-action-btn" onClick={() => navigate('/checkout')}>
                <span>Proceed to checkout</span>
                <ArrowRight size={18} />
              </Button>
              <p className="muted-note mt-2 text-center">Final prices are confirmed by the store at checkout.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
