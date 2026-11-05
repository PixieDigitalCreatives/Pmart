import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { openSocket } from '@/services/socket';
import { apiErrorMessage } from '@/services/apiClient';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { LiveTrackingMap } from '@/components/tracking/LiveTrackingMap';
import { TrackingPanel } from '@/components/tracking/TrackingPanel';
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline';
import { PaymentStatusBadge } from '@/components/order/PaymentStatusBadge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { ORDER_STATUS_LABELS, CUSTOMER_CANCELLABLE, getCustomerOrderStatus } from '@/types/orderTypes';
import { TbChevronLeft as ChevronLeft, TbChevronDown as ChevronDown, TbCash as Banknote, TbPackage as Package, TbShieldCheck as ShieldCheck, TbAlertTriangle as AlertTriangle, TbCircleX as XCircle } from 'react-icons/tb';
import { Button, EmptyState, LoadingState } from '@/components/ui';
import './OrderTrackingPage.scss';

const LIVE_STATUSES = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED'];
const MAP_STATUSES = ['PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED'];

const HEADLINES = {
  PENDING: ['Order placed', 'Waiting for the store to confirm your order.'],
  ACCEPTED: ['Order accepted', 'The store has confirmed your order.'],
  PREPARING: ['Preparing your order', 'Your items are being packed.'],
  READY: ['Ready for pickup', 'Your order is packed and waiting for a rider.'],
  ASSIGNED: ['Rider assigned', 'A delivery partner is heading to the store.'],
  PICKED_UP: ['Order picked up', 'The rider has collected your order.'],
  OUT_FOR_DELIVERY: ['On the way', 'Your delivery partner is heading to you.'],
  ARRIVED: ['Your rider has arrived', 'Share the delivery code when you receive your items.'],
  DELIVERED: ['Delivered', 'Thank you for shopping with PMart.'],
  DELIVERY_FAILED: ['Delivery attempt failed', 'The store will contact you to arrange another attempt.'],
  CANCELLED: ['Order cancelled', 'This order was cancelled.'],
  REJECTED: ['Order declined by the store', 'The store could not fulfil this order. Nothing was charged.']
};

export const OrderTrackingPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [otp, setOtp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const tracking = useLiveTracking(order && MAP_STATUSES.includes(order.status) ? id : null);

  const load = useCallback(async () => {
    try {
      const data = await orderService.getOrderById(id);
      setOrder(data);
      if (['OUT_FOR_DELIVERY', 'ARRIVED'].includes(data.status) && data.deliveryVerificationStatus !== 'OTP_VERIFIED') {
        const res = await orderService.getDeliveryOtp(id);
        setOtp(res?.deliveryOtp || null);
      } else {
        setOtp(null);
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load, live status pushes over the socket, and a slow poll as fallback.
  useEffect(() => {
    load();
    const socket = openSocket();
    socket.on('connect', () => socket.emit('join_order', id));
    socket.on('order_status_update', (p) => String(p.orderId) === String(id) && load());
    const interval = setInterval(load, 30000);
    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, [id, load]);

  const cancelOrder = async () => {
    setCancelling(true);
    setError('');
    try {
      setOrder(await orderService.cancel(id, 'Cancelled by customer'));
      setConfirmCancel(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not cancel the order.'));
      setConfirmCancel(false);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingState text="Loading your order..." />;

  if (!order) {
    return (
      <div className="container py-12">
        <EmptyState icon={Package} title="Order not found" action={<Button component={Link} to="/orders" variant="primary">View all orders</Button>} />
      </div>
    );
  }

  const status = getCustomerOrderStatus(order.status);
  const [headline, subline] = HEADLINES[order.status] || HEADLINES[status] || [ORDER_STATUS_LABELS[status] || status, ''];
  const showMap = MAP_STATUSES.includes(order.status);
  const isPaid = order.paymentStatus === 'COLLECTED';
  const isOut = order.status === 'OUT_FOR_DELIVERY';

  return (
    <div className="pmart-order-tracking-page">
      <div className="container">
        <div className="tracking-top-nav">
          <Link to="/orders" className="back-link">
            <ChevronLeft size={18} />
            <span>All orders</span>
          </Link>
        </div>

        <div className="live-delivery-tracking-section">
          <div className="order-eta-hero">
            <div className="hero-status-left">
              <span className="order-id-tag">ORDER #{order.orderNumber}</span>
              <h1 className="eta-title">{isOut && tracking.etaMinutes ? `Arriving in about ${tracking.etaMinutes} min` : headline}</h1>
              <p className="eta-subtext">{subline}</p>
              {order.status === 'CANCELLED' || order.status === 'REJECTED' ? (
                order.cancellationReason && <p className="muted-note">Reason: {order.cancellationReason}</p>
              ) : (
                <div className="hero-cod-callout">
                  <Banknote size={15} />
                  <span>Cash on delivery • {isPaid ? 'Payment collected' : `Keep ₹${order.totalAmount} ready`}</span>
                </div>
              )}
              {CUSTOMER_CANCELLABLE.includes(order.status) && (
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => setConfirmCancel(true)}>
                  <XCircle size={14} style={{ marginRight: 6 }} />
                  Cancel order
                </Button>
              )}
              {error && (
                <div className="alert alert-error mt-3">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          <div className="tracking-grid" style={{ marginTop: '20px' }}>
            {showMap && (
              <div className="tracking-left-col">
                <LiveTrackingMap
                  riderLocation={tracking.riderLocation}
                  customerLocation={tracking.customerLocation || order.deliveryAddress}
                  hubLocation={tracking.hubLocation || order.shop}
                  route={tracking.route}
                  routeError={tracking.routeError}
                  riderName={order.rider?.name || 'Rider'}
                  height="480px"
                  orderId={order._id}
                  recenterTrigger={tracking.recenterTrigger}
                />
              </div>
            )}

            <div className={`tracking-right-col ${!showMap ? 'full-width' : ''}`}>
              {LIVE_STATUSES.includes(order.status) && (
                <TrackingPanel
                  order={order}
                  trackingState={order.status === 'ASSIGNED' ? 'TRACKING_LOADING' : tracking.trackingState}
                  etaMinutes={order.status === 'ARRIVED' ? 'Arrived' : tracking.etaMinutes}
                  distanceKm={tracking.distanceKm}
                  rider={order.rider}
                  otp={otp}
                />
              )}

              {order.status === 'DELIVERED' && (
                <div className="alert alert-success mb-4">
                  <ShieldCheck size={18} />
                  <span>Delivered{order.deliveredAt ? ` at ${new Date(order.deliveredAt).toLocaleString('en-IN')}` : ''}. Delivery code verified.</span>
                </div>
              )}

              {order.status === 'DELIVERY_FAILED' && (
                <div className="alert alert-warning mb-4">
                  <AlertTriangle size={18} />
                  <span>{order.statusHistory?.slice().reverse().find((h) => h.status === 'DELIVERY_FAILED')?.note || 'The rider could not complete the delivery.'}</span>
                </div>
              )}

              <div className="tracking-timeline-card mt-6">
                <h4 className="timeline-title">Order status</h4>
                <OrderStatusTimeline status={status} timeline={order.statusHistory} />
              </div>
            </div>
          </div>
        </div>

        <div className="order-details-bottom-section">
          <div className="order-items-summary-card">
            <div className="card-top-title-row">
              <h3 className="card-title">Items ({order.items.length})</h3>
              <PaymentStatusBadge paymentStatus={order.paymentStatus} paymentMethod={order.paymentMethod} amount={order.totalAmount} />
            </div>

            <Button type="button" className="view-items-dropdown-trigger" onClick={() => setItemsOpen(!itemsOpen)} aria-expanded={itemsOpen}>
              <div className="trigger-left">
                <Package size={16} className="pkg-icon" />
                <span className="trigger-label">{itemsOpen ? 'Hide items' : 'View items'}</span>
              </div>
              <div className="trigger-right">
                <ChevronDown size={18} className={`dropdown-chevron ${itemsOpen ? 'rotated' : ''}`} />
              </div>
            </Button>

            {itemsOpen && (
              <div className="items-small-cards-grid">
                {order.items.map((item) => (
                  <div key={String(item.product)} className="small-product-order-card">
                    <div className="thumb-container">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="thumb-img" /> : <Package size={20} className="text-gray-400" />}
                    </div>
                    <div className="card-info">
                      <div className="item-name">{item.name}</div>
                      <div className="item-unit-row">
                        <span className="unit-label">{item.unit}</span>
                        <span className="dot">•</span>
                        <span className="qty-chip">Qty {item.quantity}</span>
                      </div>
                      <div className="item-rate-calc">
                        {item.quantity} × ₹{item.price}
                      </div>
                    </div>
                    <div className="card-amount">
                      <span className="currency-val">₹{Math.round(item.quantity * item.price * 100) / 100}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bill-breakdown-sub">
              <div className="line">
                <span>Item total</span>
                <span>₹{order.subTotal}</span>
              </div>
              <div className="line">
                <span>Delivery fee</span>
                <span>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span>
              </div>
              {order.platformFee > 0 && (
                <div className="line">
                  <span>Handling fee</span>
                  <span>₹{order.platformFee}</span>
                </div>
              )}
              <div className="line total">
                <span>{order.status === 'DELIVERED' ? 'Total paid' : 'Total payable on delivery'}</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
            <p className="muted-note mt-2">
              Deliver to: {order.deliveryAddress?.recipientName}, {[order.deliveryAddress?.houseNumber, order.deliveryAddress?.street, order.deliveryAddress?.city, order.deliveryAddress?.pincode].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmCancel}
        onClose={() => !cancelling && setConfirmCancel(false)}
        onConfirm={cancelOrder}
        title="Cancel this order?"
        message="The store will stop preparing it. This cannot be undone."
        confirmText="Cancel order"
        cancelText="Keep order"
        variant="danger"
        loading={cancelling}
      />
    </div>
  );
};
