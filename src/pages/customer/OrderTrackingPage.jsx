import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { LiveTrackingMap } from '@/components/tracking/LiveTrackingMap';
import { TrackingPanel } from '@/components/tracking/TrackingPanel';
import { OrderTimeline } from '@/components/order/OrderTimeline';
import {
  Clock,
  MapPin,
  Bike,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import './OrderTrackingPage.scss';

export const OrderTrackingPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const data = await orderService.getOrderById(id);
        setOrder(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

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

  const isOutForDelivery = order.status === 'out_for_delivery';
  const isDelivered = order.status === 'delivered';

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

        {/* 1. OUT_FOR_DELIVERY: BLINKIT-STYLE LIVE DELIVERY TRACKING SECTION */}
        {isOutForDelivery ? (
          <div className="live-delivery-tracking-section">
            {/* Top ETA & Status Hero */}
            <div className="order-eta-hero">
              <div className="hero-status-left">
                <span className="order-id-tag">ORDER #{order.id}</span>
                <h1 className="eta-title">
                  Arriving in {etaMinutes || 10} minutes
                </h1>
                <p className="eta-subtext">
                  Your delivery partner is on the way with your 10-minute grocery order!
                </p>
              </div>

              {/* Secure Delivery OTP */}
              <div className="otp-display-card">
                <div className="otp-card-head">
                  <KeyRound size={16} className="otp-key" />
                  <span>DELIVERY OTP</span>
                </div>
                <div className="otp-number">{order.deliveryOtp || '4829'}</div>
                <span className="otp-instruction">Share with rider only upon delivery</span>
              </div>
            </div>

            {/* Split Screen: 60% Map | 40% Tracking Information (Stacked on Mobile) */}
            <div className="live-tracking-split-view">
              {/* Map Column: 55-65% */}
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

              {/* Tracking Information Column: 35-45% */}
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
        ) : (
          /* STANDARD ORDER TIMELINE (Placed / Preparing / Delivered) */
          <>
            <div className="order-eta-hero">
              <div className="hero-status-left">
                <span className="order-id-tag">ORDER #{order.id}</span>
                <h1 className="eta-title">
                  {isDelivered ? 'Order Delivered!' : `Preparing Your Groceries`}
                </h1>
                <p className="eta-subtext">
                  {isDelivered
                    ? 'Thank you for shopping with PMart. Hope you enjoy your fresh groceries!'
                    : 'Our darkstore team is carefully handpicking and packing your items.'}
                </p>
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
                <OrderTimeline
                  timeline={order.timeline}
                  status={order.status}
                  deliveryOtp={order.deliveryOtp}
                />
              </div>
            </div>
          </>
        )}

        {/* ORDER ITEMS & BILL BREAKDOWN (Always intact underneath) */}
        <div className="order-details-bottom-section">
          <div className="order-items-summary-card">
            <h3 className="card-title">Ordered Items ({order.items.length})</h3>
            <div className="items-list">
              {order.items.map((item, idx) => (
                <div key={idx} className="ordered-item-row">
                  <img src={item.image} alt={item.name} className="item-img" />
                  <div className="item-meta">
                    <div className="item-title">{item.name}</div>
                    <div className="item-unit">{item.unit}</div>
                    <div className="item-price">
                      {item.quantity} x ₹{item.price}
                    </div>
                  </div>
                  <div className="item-total-val">₹{item.quantity * item.price}</div>
                </div>
              ))}
            </div>

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
                <span>Total Amount Paid</span>
                <span>₹{order.billing.grandTotal}</span>
              </div>
              <div className="payment-status-badge">
                <span>Payment Method: {order.payment?.method || 'UPI'} • {order.payment?.status || 'Paid'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
