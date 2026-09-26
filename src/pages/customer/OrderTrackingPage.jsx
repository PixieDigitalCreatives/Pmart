import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { LiveTrackingMap } from '@/components/tracking/LiveTrackingMap';
import { TrackingPanel } from '@/components/tracking/TrackingPanel';
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline';
import { PaymentStatusBadge } from '@/components/order/PaymentStatusBadge';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  normalizeOrderStatus
} from '@/types/orderTypes';
import {
  Clock,
  MapPin,
  Bike,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  KeyRound,
  AlertCircle,
  Banknote,
  Package
} from 'lucide-react';
import './OrderTrackingPage.scss';

export const OrderTrackingPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);

  // Hook for live real-time GPS coordinates, ETA, distance, and status
  const {
    trackingData,
    riderLocation,
    customerLocation,
    hubLocation,
    etaMinutes,
    distanceKm,
    status: liveStatus,
    trackingState,
    route,
    recenterTrigger,
    recenter
  } = useLiveTracking(id);

  // Fetch and poll order data so status changes by rider or shop update in real time
  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      try {
        const data = await orderService.getOrderById(id);
        if (isMounted) {
          setOrder(data);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setLoading(false);
      }
    };

    fetchOrder();

    // Auto-poll every 2.5 seconds while order is in flight
    const pollInterval = setInterval(() => {
      if (order && normalizeOrderStatus(order.status || order.orderStatus) === ORDER_STATUS.DELIVERED) {
        clearInterval(pollInterval);
        return;
      }
      fetchOrder();
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [id, order?.status]);

  if (loading) {
    return (
      <div className="container py-12 text-center">
        <p>Loading your order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-12 text-center">
        <h3>Order not found</h3>
        <Link to="/orders" className="btn btn-primary mt-4">View All Orders</Link>
      </div>
    );
  }

  const currentStatus = normalizeOrderStatus(order.orderStatus || order.status);
  const isOutForDelivery = currentStatus === ORDER_STATUS.OUT_FOR_DELIVERY;
  const isArrived = currentStatus === ORDER_STATUS.ARRIVED;
  const isDelivered = currentStatus === ORDER_STATUS.DELIVERED;
  const isPendingCash = order.paymentStatus !== PAYMENT_STATUS.COLLECTED;
  const payableAmount = order.billing?.grandTotal || 0;

  return (
    <div className="pmart-order-tracking-page">
      <div className="container">
        {/* Back Link & Header */}
        <div className="tracking-top-nav">
          <Link to="/orders" className="back-link">
            <ChevronLeft size={18} />
            <span>Back to All Orders</span>
          </Link>
        </div>

        {/* 1. ARRIVED BANNER (Customer notification when rider reaches doorstep) */}
        {isArrived && (
          <div className="rider-arrived-alert-card">
            <div className="alert-top-row">
              <div className="arrived-icon-circle">
                <Bike size={24} />
              </div>
              <div className="arrived-headings">
                <span className="arrived-pill">ARRIVED AT YOUR DOORSTEP</span>
                <h2 className="arrived-title">Your delivery has arrived</h2>
                <p className="arrived-subtext">
                  Our delivery partner <strong>{order.rider?.name || 'Vikram Singh'}</strong> is at your door.
                </p>
              </div>
            </div>

            <div className="cash-payment-readiness-box">
              <div className="cash-box-left">
                <div className="cash-icon-box">
                  <Banknote size={24} />
                </div>
                <div>
                  <div className="cash-callout-title">
                    Please keep <span className="highlight-amount">₹{payableAmount}</span> ready for payment.
                  </div>
                  <div className="cash-meta-row">
                    <span className="meta-item">Payment Method: <strong>Cash on Delivery (COD)</strong></span>
                    <span className="meta-separator">•</span>
                    <span className="meta-item">
                      Status: <strong className={isPendingCash ? 'text-amber' : 'text-green'}>
                        {isPendingCash ? 'Payment Pending' : 'Payment Collected ✓'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="otp-sharing-instruction">
              <KeyRound size={16} className="key-icon" />
              <span>
                Please provide your 4-digit Delivery OTP (<strong>{order.deliveryOtp || '5821'}</strong>) to the rider after inspecting and receiving your package.
              </span>
            </div>
          </div>
        )}

        {/* 2. OUT_FOR_DELIVERY: LIVE MAP & ETA */}
        {isOutForDelivery && (
          <div className="live-delivery-tracking-section">
            <div className="order-eta-hero">
              <div className="hero-status-left">
                <span className="order-id-tag">ORDER #{order.id}</span>
                <h1 className="eta-title">
                  Arriving in {etaMinutes || 10} minutes
                </h1>
                <p className="eta-subtext">
                  Your delivery partner is on the way with your grocery order!
                </p>
                <div className="hero-cod-callout">
                  <Banknote size={15} />
                  <span>Cash on Delivery: Keep <strong>₹{payableAmount}</strong> ready</span>
                </div>
              </div>

              {/* Secure Delivery OTP Notice */}
              <div className="otp-display-card">
                <div className="otp-card-head">
                  <KeyRound size={16} className="otp-key" />
                  <span>DELIVERY OTP</span>
                </div>
                <div className="otp-number">{order.deliveryOtp || '5821'}</div>
                <span className="otp-instruction">Share with rider only upon delivery</span>
              </div>
            </div>

            {/* Split Screen: Map + Panel */}
            <div className="live-tracking-split-view">
              <div className="map-column">
                <LiveTrackingMap
                  riderLocation={riderLocation || order.rider?.location}
                  customerLocation={customerLocation || order.deliveryAddress}
                  hubLocation={hubLocation || order.shop}
                  route={route}
                  etaMinutes={etaMinutes}
                  distanceKm={distanceKm}
                  trackingState={trackingState}
                  riderName={order.rider?.name || 'Vikram Singh'}
                  height="480px"
                  orderId={order.id}
                  recenterTrigger={recenterTrigger}
                />
              </div>

              <div className="info-column">
                <TrackingPanel
                  order={order}
                  trackingState={trackingState}
                  etaMinutes={etaMinutes}
                  distanceKm={distanceKm}
                  rider={order.rider}
                  otp={order.deliveryOtp}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. ORDER TIMELINE (Placed / Preparing / Arrived / Delivered) */}
        {!isOutForDelivery && (
          <div className="standard-tracking-status-block">
            <div className="order-eta-hero">
              <div className="hero-status-left">
                <span className="order-id-tag">ORDER #{order.id}</span>
                <h1 className="eta-title">
                  {isDelivered
                    ? 'Order Delivered!'
                    : isArrived
                    ? 'Delivery Partner Arrived'
                    : 'Order Confirmed'}
                </h1>
                <p className="eta-subtext">
                  {isDelivered
                    ? 'Thank you for shopping with PMart. Your cash payment and delivery OTP have been verified!'
                    : isArrived
                    ? 'Your delivery partner is at your doorstep. Please collect your items.'
                    : 'Our darkstore team is preparing your fresh grocery items.'}
                </p>
                <div className="hero-cod-callout">
                  <Banknote size={15} />
                  <span>
                    Payment Method: <strong>Cash on Delivery (COD)</strong> • Amount to Pay: <strong>₹{payableAmount}</strong>
                  </span>
                </div>
              </div>

              {order.deliveryOtp && !isDelivered && (
                <div className="otp-display-card">
                  <div className="otp-card-head">
                    <KeyRound size={16} className="otp-key" />
                    <span>DELIVERY OTP</span>
                  </div>
                  <div className="otp-number">{order.deliveryOtp}</div>
                  <span className="otp-instruction">Share with rider only upon delivery</span>
                </div>
              )}
            </div>

            <div className="tracking-grid">
              <div className="tracking-left-col">
                <OrderStatusTimeline
                  status={currentStatus}
                  timeline={order.timeline}
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. ORDER ITEMS & BILL BREAKDOWN */}
        <div className="order-details-bottom-section">
          <div className="order-items-summary-card">
            <div className="card-top-title-row">
              <h3 className="card-title">Ordered Items ({order.items.length})</h3>
              <PaymentStatusBadge
                paymentStatus={order.paymentStatus}
                paymentMethod={order.paymentMethod}
                amount={payableAmount}
              />
            </div>

            {/* Dropdown trigger: View Items */}
            <button
              type="button"
              className="view-items-dropdown-trigger"
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              aria-expanded={isItemsExpanded}
            >
              <div className="trigger-left">
                <Package size={16} className="pkg-icon" />
                <span className="trigger-label">
                  {isItemsExpanded ? 'Hide Items' : 'View Items'} ({order.items.length} {order.items.length === 1 ? 'item' : 'items'})
                </span>
              </div>
              <div className="trigger-right">
                <span className="subtext">{isItemsExpanded ? 'Tap to collapse' : 'Tap to expand'}</span>
                <ChevronDown size={18} className={`dropdown-chevron ${isItemsExpanded ? 'rotated' : ''}`} />
              </div>
            </button>

            {/* Small Product Cards Grid (Visible on Dropdown Click) */}
            {isItemsExpanded && (
              <div className="items-small-cards-grid">
                {order.items.map((item, idx) => (
                  <div key={idx} className="small-product-order-card">
                    <div className="thumb-container">
                      <img src={item.image} alt={item.name} className="thumb-img" />
                    </div>
                    <div className="card-info">
                      <div className="item-name">{item.name}</div>
                      <div className="item-unit-row">
                        <span className="unit-label">{item.unit}</span>
                        <span className="dot">•</span>
                        <span className="qty-chip">Qty: {item.quantity}</span>
                      </div>
                      <div className="item-rate-calc">
                        {item.quantity} × ₹{item.price}
                      </div>
                    </div>
                    <div className="card-amount">
                      <span className="currency-val">₹{item.quantity * item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bill-breakdown-sub">
              <div className="line">
                <span>Item Total</span>
                <span>₹{order.billing.itemTotal}</span>
              </div>
              <div className="line">
                <span>Delivery Fee</span>
                <span>{order.billing.deliveryFee === 0 ? 'FREE' : `₹${order.billing.deliveryFee}`}</span>
              </div>
              <div className="line total">
                <span>Total Amount {isDelivered ? 'Paid' : 'Payable on Delivery'}</span>
                <span>₹{order.billing.grandTotal}</span>
              </div>
              <div className="payment-status-badge-container">
                <div className="cod-details-row">
                  <span className="cod-title">Payment: Cash on Delivery (COD)</span>
                  <span className="cod-amount">Amount: ₹{payableAmount}</span>
                  <span className={`cod-status ${isPendingCash ? 'status-pending' : 'status-collected'}`}>
                    Status: {isPendingCash ? 'Payment Pending' : 'Payment Collected ✓'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
