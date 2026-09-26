import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { deliveryService } from '@/services/deliveryService';
import { LiveTrackingMap } from '@/components/tracking/LiveTrackingMap';
import { locationService } from '@/services/locationService';
import { CollectPaymentSection } from '@/components/delivery/CollectPaymentSection';
import { DeliveryVerificationSection } from '@/components/delivery/DeliveryVerificationSection';
import { DeliveryCompletionScreen } from '@/components/delivery/DeliveryCompletionScreen';
import { PaymentStatusBadge } from '@/components/order/PaymentStatusBadge';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  DELIVERY_VERIFICATION_STATUS,
  normalizeOrderStatus
} from '@/types/orderTypes';
import {
  Navigation,
  Phone,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  KeyRound,
  ChevronLeft,
  ShieldCheck,
  ArrowRight,
  Banknote,
  Loader2
} from 'lucide-react';
import './RiderOrderDetailPage.scss';

export const RiderOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [isGpsActive, setIsGpsActive] = useState(true);
  const [liveGpsCoords, setLiveGpsCoords] = useState(null);

  const fetchOrder = async () => {
    try {
      const data = await orderService.getOrderById(id);
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchOrder();
  }, [id]);

  // Activate location tracking when order is out for delivery or arrived
  useEffect(() => {
    const norm = normalizeOrderStatus(order?.orderStatus || order?.status);
    if ((norm === ORDER_STATUS.OUT_FOR_DELIVERY || norm === ORDER_STATUS.ARRIVED) && isGpsActive) {
      locationService.startLocationTracking(order.id, (loc) => {
        setLiveGpsCoords(loc);
      });
    } else {
      locationService.stopLocationTracking();
    }

    return () => locationService.stopLocationTracking();
  }, [order?.status, order?.orderStatus, isGpsActive, order?.id]);

  const handleStageUpdate = async (stage) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const updated = await orderService.updateOrderStatus(order.id, stage);
      setOrder({ ...updated });
      setActionNotice(`Order status updated to "${stage.replace(/_/g, ' ')}"`);
      setTimeout(() => setActionNotice(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rider taps "Arrived at Customer"
  const handleArrivedAtCustomer = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const updated = await deliveryService.arriveAtCustomer(order.id);
      setOrder({ ...updated });
      setActionNotice('Status updated to ARRIVED. Please collect payment from customer.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Called when payment is marked as collected in CollectPaymentSection
  const handlePaymentCollected = async () => {
    await fetchOrder();
    setActionNotice('Cash collected ✓ Now verify customer delivery OTP.');
  };

  // Called when OTP verification succeeds in DeliveryVerificationSection
  const handleDeliveryVerified = async (deliveredOrder) => {
    setOrder(deliveredOrder);
    setActionNotice('✓ Delivery completed and verified successfully!');
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <h3>Order not found</h3>
        <Link to="/rider" className="btn btn-primary mt-3">Back to Rider Hub</Link>
      </div>
    );
  }

  const currentStatus = normalizeOrderStatus(order.orderStatus || order.status);
  const isOutForDelivery = currentStatus === ORDER_STATUS.OUT_FOR_DELIVERY;
  const isArrived = currentStatus === ORDER_STATUS.ARRIVED;
  const isDelivered = currentStatus === ORDER_STATUS.DELIVERED;
  const isCashCollected = order.paymentStatus === PAYMENT_STATUS.COLLECTED;
  const isOtpVerified = order.deliveryVerificationStatus === DELIVERY_VERIFICATION_STATUS.OTP_VERIFIED;

  return (
    <div className="rider-order-detail-page">
      {/* Top Back navigation */}
      <div className="detail-top-nav">
        <Link to="/rider" className="back-link">
          <ChevronLeft size={16} />
          <span>Back to Rider Hub</span>
        </Link>
        <span className="order-id-badge font-mono font-bold">#{order.id}</span>
      </div>

      {actionNotice && (
        <div className="action-notice-toast">
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 1. COMPLETED SCREEN (When delivery is fully completed) */}
      {isDelivered && (
        <DeliveryCompletionScreen
          order={order}
          onViewOrder={() => navigate('/rider')}
        />
      )}

      {/* 2. DEDICATED ARRIVED WORKFLOW: COLLECT PAYMENT & DELIVERY VERIFICATION */}
      {isArrived && (
        <div className="rider-arrived-workflow-container">
          {!isCashCollected ? (
            /* Step A: Collect Payment Section */
            <CollectPaymentSection
              order={order}
              onPaymentSuccess={handlePaymentCollected}
              isProcessing={isProcessing}
            />
          ) : !isOtpVerified ? (
            /* Step B: Delivery OTP Verification Section */
            <DeliveryVerificationSection
              order={order}
              onVerificationSuccess={handleDeliveryVerified}
              isProcessing={isProcessing}
            />
          ) : (
            /* Step C: Completed */
            <DeliveryCompletionScreen
              order={order}
              onViewOrder={() => navigate('/rider')}
            />
          )}
        </div>
      )}

      {/* 3. LIVE GPS TELEMETRY & ROUTE MAP */}
      <div className="gps-map-section-wrapper" style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            marginBottom: '10px',
            fontSize: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isGpsActive ? '#16a34a' : '#d97706',
                display: 'inline-block'
              }}
            />
            <span style={{ fontWeight: 600, color: '#111318' }}>
              {isGpsActive ? 'Live GPS Telemetry Active' : 'GPS Telemetry Paused'}
            </span>
            {liveGpsCoords && (
              <span style={{ color: '#6b7280' }}>
                ({liveGpsCoords.lat.toFixed(4)}, {liveGpsCoords.lng.toFixed(4)})
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={() => setIsGpsActive(!isGpsActive)}
          >
            {isGpsActive ? 'Pause GPS' : 'Resume GPS'}
          </button>
        </div>

        <LiveTrackingMap
          riderLocation={order?.rider?.location}
          customerLocation={order?.deliveryAddress}
          hubLocation={order?.shop}
          height="280px"
          riderName={order?.rider?.name || 'You (Partner)'}
          orderId={order?.id}
        />
      </div>

      {/* 4. CUSTOMER & ADDRESS DETAILS CARD */}
      <div className="rider-info-card">
        <div className="customer-header-row">
          <div>
            <span className="tag-pill">{order?.deliveryAddress?.tag || 'Home'} Delivery</span>
            <h3 className="customer-name">{order?.customer?.name || 'Customer'}</h3>
            <p className="address-full">{order?.deliveryAddress?.line1}, {order?.deliveryAddress?.city}</p>
          </div>
          <a href={`tel:${order?.customer?.phone}`} className="call-customer-btn" title="Call Customer">
            <Phone size={18} />
          </a>
        </div>

        {order?.deliveryInstructions && (
          <div className="delivery-note-box">
            <strong>Customer Instruction:</strong>
            <p>{order.deliveryInstructions}</p>
          </div>
        )}

        <div className="payment-mode-box">
          <span className="label">Payment Mode:</span>
          <PaymentStatusBadge
            paymentStatus={order.paymentStatus}
            paymentMethod={order.paymentMethod}
            amount={order.billing?.grandTotal}
            compact={true}
          />
        </div>
      </div>

      {/* 5. ORDER MANIFEST */}
      <div className="rider-info-card">
        <h4 className="card-heading">Package Manifest ({order?.items?.length || 0} items)</h4>
        <div className="items-manifest-list">
          {order?.items?.map((item, idx) => (
            <div key={idx} className="manifest-row">
              <span className="qty-chip">{item.quantity}x</span>
              <span className="name">{item.name}</span>
              <span className="unit text-muted text-xs">({item.unit})</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. PRIMARY ACTION CONTROLS BAR (Mobile-First Sticky/Stacked) */}
      <div className="rider-action-bar">
        {currentStatus === ORDER_STATUS.READY_FOR_PICKUP && (
          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={() => handleStageUpdate(ORDER_STATUS.OUT_FOR_DELIVERY)}
            disabled={isProcessing}
          >
            <Navigation size={18} />
            <span>Confirm Picked Up & Start Run</span>
          </button>
        )}

        {isOutForDelivery && (
          <button
            className="btn btn-primary btn-lg btn-full arrived-cta-btn"
            onClick={handleArrivedAtCustomer}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Updating Status...</span>
              </>
            ) : (
              <>
                <MapPin size={18} />
                <span>Arrived at Customer</span>
              </>
            )}
          </button>
        )}

        {isArrived && !isCashCollected && (
          <div className="rider-guidance-pill warning">
            <Banknote size={16} />
            <span>Collect ₹{order.billing?.grandTotal} cash from customer above</span>
          </div>
        )}

        {isArrived && isCashCollected && !isOtpVerified && (
          <div className="rider-guidance-pill info">
            <KeyRound size={16} />
            <span>Enter the customer's 4-digit Delivery OTP above</span>
          </div>
        )}

        {isDelivered && (
          <div className="delivery-completed-banner">
            <CheckCircle2 size={24} className="text-success" />
            <span>Delivery Completed Successfully</span>
          </div>
        )}
      </div>
    </div>
  );
};
