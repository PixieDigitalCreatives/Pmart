import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import { orderService } from '@/services/orderService';
import { CODPaymentCard } from '@/components/order/CODPaymentCard';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/types/orderTypes';
import {
  MapPin,
  CheckCircle2,
  Banknote,
  ShieldCheck,
  Clock,
  ArrowRight,
  Plus,
  Home,
  Briefcase
} from 'lucide-react';
import './CheckoutPage.scss';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, billSummary, clearCart, refreshCart } = useCart();
  const { savedLocations, selectedLocation, selectLocation, setLocationModalOpen } = useLocation();
  const { user } = useAuth();

  const [deliveryNote, setDeliveryNote] = useState('Ring the doorbell twice. Please handle fragile produce carefully.');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.COD);
  const [isPlacing, setIsPlacing] = useState(false);

  if (items.length === 0) {
    return (
      <div className="container py-12 text-center">
        <h3>Your basket is empty</h3>
        <Link to="/" className="btn btn-primary mt-4">Start Shopping</Link>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    console.log('[CHECKOUT] Place order clicked');
    setIsPlacing(true);
    try {
      console.log('[CHECKOUT] Validating checkout');
      const chosenAddr = selectedLocation;
      console.log('[CHECKOUT] Selected address:', !!chosenAddr);
      console.log('[CHECKOUT] Payment method:', paymentMethod);
      console.log('[CHECKOUT] Cart items:', items.length);
      
      if (!chosenAddr) {
        alert('Please select a delivery address');
        setIsPlacing(false);
        return;
      }

      if (chosenAddr.isDetected || !chosenAddr._id) {
        alert('Please save this address with complete details (House No, Flat, etc.) before placing the order.');
        setIsPlacing(false);
        return;
      }

      const orderPayload = {
        items,
        paymentMethod: paymentMethod,
        deliveryInstructions: deliveryNote,
        addressId: chosenAddr._id
      };

      console.log('[CHECKOUT] Sending checkout request', orderPayload);
      const newOrder = await orderService.createOrder(orderPayload);
      clearCart();
      setIsPlacing(false);
      navigate(`/orders/${newOrder.id}`);
    } catch (err) {
      console.error('[CHECKOUT] Error:', err);
      
      const resData = err?.response?.data;
      if (resData?.code === 'PRODUCT_NOT_FOUND' || resData?.code === 'INSUFFICIENT_STOCK') {
        alert(resData.message || 'One item in your cart is no longer available in the requested quantity. Your cart has been refreshed.');
        if (refreshCart) {
          await refreshCart();
        }
      } else {
        alert(resData?.message || err.message || 'Failed to place order. Please try again.');
      }
      setIsPlacing(false);
    }
  };

  return (
    <div className="pmart-checkout-page">
      <div className="container">
        <div className="checkout-page-title">
          <h1>Secure Checkout</h1>
          <div className="security-tag">
            <ShieldCheck size={16} />
            <span>256-Bit SSL Encrypted Payment</span>
          </div>
        </div>

        <div className="checkout-grid-layout">
          {/* Main Form Sections */}
          <div className="checkout-main-col">
            {/* Step 1: Delivery Address */}
            <section className="checkout-section-card">
              <div className="section-head">
                <div className="step-num">1</div>
                <div>
                  <h3 className="step-title">Delivery Address</h3>
                  <p className="step-subtitle">Express delivery to your selected address</p>
                </div>
              </div>

              <div className="selected-delivery-address">
                {selectedLocation ? (() => {
                  const addr = selectedLocation;
                  return (
                    <div className="selected-addr-card">
                      <div className="addr-top-flex">
                        <div className="tag-box">
                          {addr.tag === 'Home' || addr.label === 'HOME' ? <Home size={16} /> : (addr.tag === 'Work' || addr.label === 'WORK' ? <Briefcase size={16} /> : <MapPin size={16} />)}
                          <span className="font-bold ml-1">{addr.tag || addr.label}</span>
                        </div>
                        <button className="change-btn" onClick={() => setLocationModalOpen(true)}>Change</button>
                      </div>
                      
                      <div className="addr-recipient">
                        <strong>{addr.recipientName || user?.name || 'Customer'}</strong>
                      </div>
                      
                      <div className="addr-details">
                        {addr.formattedAddress || [addr.houseNumber, addr.buildingName, addr.street, addr.area, addr.city, addr.pincode].filter(Boolean).join(', ')}
                      </div>
                      
                      <div className="addr-phone">
                        +91 {addr.recipientPhone || user?.phone || 'N/A'}
                      </div>
                      
                      {addr.isDetected && (
                        <p className="text-red-500 text-sm mt-2">Please save this address with complete details before placing an order.</p>
                      )}
                    </div>
                  );
                })() : (
                  <div className="no-address-state">
                    <p>Please select a delivery address</p>
                    <button className="btn btn-outline btn-sm mt-2" onClick={() => setLocationModalOpen(true)}>Select Address</button>
                  </div>
                )}
              </div>
            </section>

            {/* Step 2: Delivery Instructions */}
            <section className="checkout-section-card">
              <div className="section-head">
                <div className="step-num">2</div>
                <div>
                  <h3 className="step-title">Delivery Instructions</h3>
                  <p className="step-subtitle">Help your delivery partner locate your doorstep effortlessly</p>
                </div>
              </div>

              <div className="instruction-quick-pills">
                <button
                  type="button"
                  className="note-pill"
                  onClick={() => setDeliveryNote('Leave package with security guard at the gate.')}
                >
                  Leave with security
                </button>
                <button
                  type="button"
                  className="note-pill"
                  onClick={() => setDeliveryNote('Do not ring doorbell, baby is sleeping.')}
                >
                  Do not ring bell
                </button>
                <button
                  type="button"
                  className="note-pill"
                  onClick={() => setDeliveryNote('Leave at doorstep and send OTP on WhatsApp.')}
                >
                  Leave at door
                </button>
              </div>

              <textarea
                className="form-control delivery-note-input"
                rows="2"
                placeholder="Add special instructions for delivery partner (optional)..."
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
              />
            </section>

            {/* Step 3: Payment Method (COD Only) */}
            <section className="checkout-section-card">
              <div className="section-head">
                <div className="step-num">3</div>
                <div>
                  <h3 className="step-title">Payment Method</h3>
                  <p className="step-subtitle">Cash on Delivery (COD) only for your neighborhood</p>
                </div>
              </div>

              <div className="payment-options-list">
                <CODPaymentCard
                  amount={billSummary.grandTotal}
                  selected={true}
                  onSelect={() => setPaymentMethod(PAYMENT_METHOD.COD)}
                />
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary & Place CTA */}
          <div className="checkout-summary-col">
            <div className="summary-box">
              <div className="eta-badge-row">
                <Clock size={16} className="clock" />
                <span>Delivering in <strong>10–12 Mins</strong></span>
              </div>

              <h3 className="box-title">Order Summary ({items.length} items)</h3>

              {/* Items preview */}
              <div className="items-preview-list">
                {items.map((i) => (
                  <div key={i.id} className="item-row">
                    <div className="row-left">
                      <span className="qty-tag">{i.quantity}x</span>
                      <span className="item-title">{i.name}</span>
                    </div>
                    <span className="item-amt">₹{i.price * i.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="divider" />

              <div className="calc-row">
                <span>Item Total</span>
                <span>₹{billSummary.itemTotal}</span>
              </div>
              <div className="calc-row">
                <span>Delivery Fee</span>
                <span>{billSummary.deliveryFee === 0 ? <strong className="text-success">FREE</strong> : `₹${billSummary.deliveryFee}`}</span>
              </div>
              <div className="calc-row">
                <span>Platform Handling Fee</span>
                <span>₹{billSummary.platformFee}</span>
              </div>
              {billSummary.savings > 0 && (
                <div className="calc-row savings">
                  <span>Total Discount</span>
                  <span>-₹{billSummary.savings}</span>
                </div>
              )}

              <div className="divider" />

              <div className="calc-row total-row">
                <span>Total to Pay</span>
                <span className="total-amount">₹{billSummary.grandTotal}</span>
              </div>

              <button
                className="btn btn-primary btn-lg btn-full place-order-btn"
                onClick={handlePlaceOrder}
                disabled={isPlacing}
              >
                <span>{isPlacing ? 'Placing Order...' : `Place COD Order • ₹${billSummary.grandTotal}`}</span>
                <ArrowRight size={18} />
              </button>

              <div className="safety-note">
                <ShieldCheck size={14} className="shield" />
                <span>Pay ₹{billSummary.grandTotal} cash upon doorstep delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
