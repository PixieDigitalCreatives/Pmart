import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useLocation } from '@/context/LocationContext';
import { orderService } from '@/services/orderService';
import apiClient, { apiErrorMessage } from '@/services/apiClient';
import { CODPaymentCard } from '@/components/order/CODPaymentCard';
import { getFullAddressString } from '@/utils/addressUtils';
import { TbMapPin as MapPin, TbArrowRight as ArrowRight, TbShoppingCart as ShoppingCart, TbAlertCircle as AlertCircle, TbHome as Home, TbBriefcase as Briefcase } from 'react-icons/tb';
import { Button, EmptyState } from '@/components/ui';
import './CheckoutPage.scss';

const newIdempotencyKey = () =>
  (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '');

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, billSummary, clearCart, refreshCart } = useCart();
  const { selectedLocation, setLocationModalOpen } = useLocation();

  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [serviceability, setServiceability] = useState(null);
  // One key per checkout attempt, so a retried or double-clicked submit cannot create two orders.
  const idempotencyKey = useRef(newIdempotencyKey());

  const address = selectedLocation && !selectedLocation.isDetected ? selectedLocation : null;

  useEffect(() => {
    setServiceability(null);
    if (!address?.location?.coordinates) return;
    const [lng, lat] = address.location.coordinates;
    apiClient
      .post('/addresses/serviceability', { lat, lng })
      .then((res) => setServiceability(res.data.data))
      .catch(() => setServiceability(null));
  }, [address?._id]);

  if (items.length === 0) {
    return (
      <div className="container py-12">
        <EmptyState icon={ShoppingCart} title="Your cart is empty" description="Add products to place an order." action={<Button component={Link} to="/" variant="primary">Start shopping</Button>} />
      </div>
    );
  }

  const blocked = !address || (serviceability && !serviceability.serviceable);

  const placeOrder = async () => {
    if (!address) {
      setError('Choose a saved delivery address first.');
      return;
    }
    setPlacing(true);
    setError('');
    try {
      const order = await orderService.checkout({ addressId: address._id, items, deliveryInstructions: note.trim(), idempotencyKey: idempotencyKey.current });
      clearCart();
      navigate(`/orders/${order._id}`, { replace: true });
    } catch (err) {
      const code = err.response?.data?.code;
      setError(apiErrorMessage(err, 'Could not place the order. Please try again.'));
      if (['INSUFFICIENT_STOCK', 'PRODUCT_NOT_FOUND', 'IDEMPOTENCY_MISMATCH'].includes(code)) {
        idempotencyKey.current = newIdempotencyKey();
        await refreshCart();
      }
    } finally {
      setPlacing(false);
    }
  };

  const LabelIcon = address?.label === 'HOME' ? Home : address?.label === 'WORK' ? Briefcase : MapPin;

  return (
    <div className="pmart-checkout-page">
      <div className="container">
        <div className="checkout-page-title">
          <h1>Checkout</h1>
        </div>

        <div className="checkout-grid-layout">
          <div className="checkout-main-col">
            <section className="checkout-section-card">
              <div className="section-head">
                <div className="step-num">1</div>
                <div>
                  <h3 className="step-title">Delivery address</h3>
                </div>
              </div>
              <div className="selected-delivery-address">
                {address ? (
                  <div className="selected-addr-card">
                    <div className="addr-top-flex">
                      <div className="tag-box">
                        <LabelIcon size={16} />
                        <span className="font-bold ml-1">{address.tag}</span>
                      </div>
                      <Button className="change-btn" onClick={() => setLocationModalOpen(true)}>
                        Change
                      </Button>
                    </div>
                    <div className="addr-recipient">
                      <strong>{address.recipientName}</strong>
                    </div>
                    <div className="addr-details">{getFullAddressString(address)}</div>
                    <div className="addr-phone">{address.recipientPhone}</div>
                    {serviceability && !serviceability.serviceable && (
                      <div className="alert alert-error mt-3">
                        <AlertCircle size={16} />
                        <span>{serviceability.message}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-address-state">
                    <p>{selectedLocation?.isDetected ? 'Save your current location as an address to deliver there.' : 'Choose where we should deliver.'}</p>
                    <Button variant="outline" size="sm" style={{ marginTop: '8px' }} onClick={() => setLocationModalOpen(true)}>
                      Select address
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <section className="checkout-section-card">
              <div className="section-head">
                <div className="step-num">2</div>
                <div>
                  <h3 className="step-title">Delivery instructions</h3>
                  <p className="step-subtitle">Optional note for the store and rider</p>
                </div>
              </div>
              <textarea
                className="form-control delivery-note-input"
                rows="2"
                maxLength={300}
                placeholder="e.g. Call when you reach the gate"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </section>

            <section className="checkout-section-card">
              <div className="section-head">
                <div className="step-num">3</div>
                <div>
                  <h3 className="step-title">Payment</h3>
                  <p className="step-subtitle">Cash on delivery</p>
                </div>
              </div>
              <div className="payment-options-list">
                <CODPaymentCard amount={billSummary.grandTotal} selected onSelect={() => {}} />
              </div>
            </section>
          </div>

          <div className="checkout-summary-col">
            <div className="summary-box">
              <h3 className="box-title">Order summary ({items.length} {items.length === 1 ? 'item' : 'items'})</h3>
              <div className="items-preview-list">
                {items.map((i) => (
                  <div key={i.id} className="item-row">
                    <div className="row-left">
                      <span className="qty-tag">{i.quantity}x</span>
                      <span className="item-title">{i.name}</span>
                    </div>
                    <span className="item-amt">₹{Math.round(i.price * i.quantity * 100) / 100}</span>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="calc-row">
                <span>Item total</span>
                <span>₹{billSummary.itemTotal}</span>
              </div>
              <div className="calc-row">
                <span>Delivery fee</span>
                <span>{billSummary.deliveryFee === 0 ? <strong className="text-success">FREE</strong> : `₹${billSummary.deliveryFee}`}</span>
              </div>
              {billSummary.platformFee > 0 && (
                <div className="calc-row">
                  <span>Handling fee</span>
                  <span>₹{billSummary.platformFee}</span>
                </div>
              )}
              <div className="divider" />
              <div className="calc-row total-row">
                <span>Total to pay</span>
                <span className="total-amount">₹{billSummary.grandTotal}</span>
              </div>

              {error && (
                <div className="alert alert-error mt-3" role="alert">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <Button variant="primary" size="lg" className="place-order-btn mt-3" style={{ width: '100%' }} onClick={placeOrder} isLoading={placing} disabled={placing || blocked}>
                <span>{placing ? 'Placing order…' : `Place order • ₹${billSummary.grandTotal}`}</span>
                {!placing && <ArrowRight size={18} />}
              </Button>
              <p className="muted-note mt-2 text-center">Pay in cash when your order arrives.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
