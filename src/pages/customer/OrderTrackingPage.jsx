import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { LiveTrackingMap } from '@/components/tracking/LiveTrackingMap';
import { TrackingPanel } from '@/components/tracking/TrackingPanel';
import { Button } from '@/components/ui';
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline';
import { PaymentStatusBadge } from '@/components/order/PaymentStatusBadge';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  normalizeOrderStatus,
  getCustomerOrderStatus
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
    routeError,
    recenterTrigger,
    recenter
  } = useLiveTracking(id);

  // Fetch and poll order data + OTP so status/code changes by rider update in real time
  const [deliveryOtp, setDeliveryOtp] = useState(null);

  const orderStatusRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOrderAndOtp = async () => {
      try {
        const data = await orderService.getOrderById(id);
        if (!isMounted) return;

        setOrder(data);
        setLoading(false);
        orderStatusRef.current = data?.status || data?.orderStatus;

        // Fetch OTP alongside order when status warrants it
        const currentStatus = normalizeOrderStatus(data?.status || data?.orderStatus);
        if (['OUT_FOR_DELIVERY', 'ARRIVED'].includes(currentStatus) && data?.deliveryVerificationStatus !== 'OTP_VERIFIED') {
          const otp = await orderService.getDeliveryOtp(id);
          if (isMounted && otp) {
            setDeliveryOtp(otp);
          }
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setLoading(false);
      }
    };

    fetchOrderAndOtp();

    // Poll every 5 seconds — fetches both order + OTP in one cycle
    const pollInterval = setInterval(() => {
      const currentNorm = getCustomerOrderStatus(orderStatusRef.current);
      if (currentNorm === ORDER_STATUS.DELIVERED || currentNorm === ORDER_STATUS.CANCELLED) {
        clearInterval(pollInterval);
        return;
      }
      fetchOrderAndOtp();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
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
        <Button component={Link} to="/orders" variant="primary" className="mt-4">View All Orders</Button>
      </div>
    );
  }

  const currentStatus = getCustomerOrderStatus(order.orderStatus || order.status);
  const isOutForDelivery = currentStatus === ORDER_STATUS.OUT_FOR_DELIVERY;
  const isArrived = currentStatus === ORDER_STATUS.ARRIVED;
  const isDelivered = currentStatus === ORDER_STATUS.DELIVERED;
  const isCancelled = currentStatus === ORDER_STATUS.CANCELLED;
  const isPendingCash = order.paymentStatus !== PAYMENT_STATUS.COLLECTED;
  const payableAmount = order.totalAmount || order.billing?.grandTotal || 0;

  const showDeliveryOtp = ['OUT_FOR_DELIVERY', 'ARRIVED'].includes(currentStatus) 
    && order.deliveryVerificationStatus !== 'OTP_VERIFIED' 
    && currentStatus !== 'DELIVERED';

  const showTrackingMap = ['OUT_FOR_DELIVERY', 'ARRIVED'].includes(currentStatus);

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

        <div className="live-delivery-tracking-section">
          {/* ORDER HEADER / HERO */}
          <div className="order-eta-hero">
            <div className="hero-status-left">
              <span className="order-id-tag">ORDER #{order.orderNumber || order.id}</span>
              <h1 className="eta-title">
                {isDelivered ? 'Order Delivered!'
                  : isCancelled ? 'Order Cancelled'
                  : isArrived ? 'Your delivery has arrived'
                  : isOutForDelivery ? `Arriving in ${etaMinutes || '--'} minutes`
                  : currentStatus === ORDER_STATUS.PENDING ? 'Order Placed'
                  : currentStatus === ORDER_STATUS.ACCEPTED ? 'Order Accepted'
                  : currentStatus === ORDER_STATUS.PREPARING ? 'Preparing Order'
                  : currentStatus === ORDER_STATUS.READY ? 'Ready for Pickup'
                  : currentStatus === ORDER_STATUS.ASSIGNED ? 'Rider Assigned'
                  : currentStatus === ORDER_STATUS.PICKED_UP ? 'Order Picked Up'
                  : 'Order Confirmed'}
              </h1>
              <p className="eta-subtext">
                {isDelivered ? 'Thank you for shopping with PMart. Your cash payment and delivery OTP have been verified!'
                  : isCancelled ? 'This order has been cancelled. If you have been charged, the amount will be refunded shortly.'
                  : isArrived ? `Our delivery partner ${order.rider?.name || 'Delivery Partner'} is at your door.`
                  : isOutForDelivery ? 'Your delivery partner is on the way with your grocery order!'
                  : currentStatus === ORDER_STATUS.PENDING ? 'Waiting for darkstore confirmation.'
                  : currentStatus === ORDER_STATUS.ACCEPTED ? 'Your order has been accepted by the darkstore.'
                  : currentStatus === ORDER_STATUS.PREPARING ? 'Our darkstore team is preparing your fresh grocery items.'
                  : currentStatus === ORDER_STATUS.READY ? 'Your items are packed and waiting for the rider.'
                  : currentStatus === ORDER_STATUS.ASSIGNED ? 'A delivery partner has been assigned to your order.'
                  : currentStatus === ORDER_STATUS.PICKED_UP ? 'The rider has picked up your order and will head your way soon.'
                  : 'We are processing your order.'}
              </p>
              
              <div className="hero-cod-callout">
                <Banknote size={15} />
                <span>
                  Payment Method: <strong>{order.paymentMethod || 'Cash on Delivery (COD)'}</strong> 
                  <span style={{ margin: '0 8px' }}>•</span>
                  {isPendingCash ? `Keep ₹${payableAmount} ready` : 'Payment Collected ✓'}
                </span>
              </div>
            </div>

          </div>

          {/* Map and Info Layout */}
          <div className="tracking-grid" style={{ marginTop: '20px' }}>
            {showTrackingMap && (
              <div className="tracking-left-col">
                <LiveTrackingMap
                  riderLocation={riderLocation || order.rider?.location}
                  customerLocation={customerLocation || order.deliveryAddress}
                  hubLocation={hubLocation || order.shop}
                  route={route}
                  routeError={routeError}
                  etaMinutes={etaMinutes}
                  distanceKm={distanceKm}
                  trackingState={trackingState}
                  riderName={order.rider?.name || 'Rider'}
                  height="480px"
                  orderId={order.id}
                  recenterTrigger={recenterTrigger}
                />
              </div>
            )}

            <div className={`tracking-right-col ${!showTrackingMap ? 'full-width' : ''}`}>
              {['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED'].includes(currentStatus) && (
                <TrackingPanel
                  order={order}
                  trackingState={trackingState}
                  etaMinutes={isArrived ? 'Arrived' : etaMinutes}
                  distanceKm={distanceKm}
                  rider={order.rider}
                  otp={deliveryOtp}
                />
              )}

              {currentStatus === 'DELIVERED' && (
                <div className="pmart-delivery-otp-card" style={{ marginBottom: '1.5rem', border: '1px solid #16a34a' }}>
                  <div className="otp-top-row">
                    <div className="otp-shield-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                      <ShieldCheck size={18} />
                    </div>
                    <div className="otp-text-meta">
                      <h4 className="otp-title" style={{ color: '#16a34a' }}>Delivery Verification</h4>
                      <p className="otp-desc" style={{ color: '#15803d', fontWeight: '500' }}>OTP Verified ✓</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="tracking-timeline-card mt-6">
                <h4 className="timeline-title">Order Status</h4>
                <OrderStatusTimeline
                  status={currentStatus}
                  timeline={order.timeline}
                />
              </div>
            </div>
          </div>
        </div>

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
            <Button
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
            </Button>

            {/* Small Product Cards Grid (Visible on Dropdown Click) */}
            {isItemsExpanded && (
              <div className="items-small-cards-grid">
                {order.items.map((item, idx) => (
                  <div key={idx} className="small-product-order-card">
                    <div className="thumb-container">
                      <img src={item.imageUrl || item.image} alt={item.name} className="thumb-img" />
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
                <span>₹{order.subTotal || order.billing?.itemTotal || 0}</span>
              </div>
              <div className="line">
                <span>Delivery Fee</span>
                <span>{(order.deliveryFee === 0 || order.billing?.deliveryFee === 0) ? 'FREE' : `₹${order.deliveryFee || order.billing?.deliveryFee || 0}`}</span>
              </div>
              <div className="line total">
                <span>Total Amount {isDelivered ? 'Paid' : 'Payable on Delivery'}</span>
                <span>₹{order.totalAmount || order.billing?.grandTotal || 0}</span>
              </div>
              <div className="payment-status-badge-container">
                <div className="cod-details-row">
                  <span className="cod-title">Payment: {order.paymentMethod || 'Cash on Delivery (COD)'}</span>
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
