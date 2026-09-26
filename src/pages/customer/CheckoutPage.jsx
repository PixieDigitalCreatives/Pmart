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
  const { items, billSummary, clearCart } = useCart();
  const { savedLocations, selectedLocation, selectLocation } = useLocation();
  const { user } = useAuth();

  const [activeAddressId, setActiveAddressId] = useState(selectedLocation?.id || savedLocations[0]?.id);
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
    setIsPlacing(true);
    try {
      const chosenAddr = savedLocations.find(l => l.id === activeAddressId) || selectedLocation;
      const orderPayload = {
        customer: user || {
          id: 'cust-1',
          name: 'Rohan Sharma',
          phone: '+91 98765 43210'
        },
        deliveryAddress: {
          tag: chosenAddr.tag,
          line1: chosenAddr.address,
          city: 'Noida',
          pincode: chosenAddr.pincode,
          phone: user?.phone || '+91 98765 43210'
        },
        deliveryInstructions: deliveryNote,
        items,
        billing: billSummary,
        paymentMethod: PAYMENT_METHOD.COD,
        paymentStatus: PAYMENT_STATUS.PENDING
      };

      const newOrder = await orderService.createOrder(orderPayload);
      clearCart();
      setIsPlacing(false);
      navigate(`/orders/${newOrder.id}`);
    } catch (err) {
      console.error(err);
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

              <div className="addresses-selection-grid">
                {savedLocations.map((addr) => {
                  const isSelected = activeAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      className={`checkout-addr-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setActiveAddressId(addr.id);
                        selectLocation(addr);
                      }}
                    >
                      <div className="addr-top">
                        <div className="tag-box">
                          {addr.tag === 'Home' ? <Home size={15} /> : <Briefcase size={15} />}
                          <span>{addr.tag}</span>
                        </div>
                        {isSelected && <CheckCircle2 size={18} className="check-icon" />}
                      </div>
                      <div className="addr-text">{addr.address}</div>
                      <div className="pincode-text">PIN: {addr.pincode}</div>
                    </div>
                  );
                })}
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
