import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { riderService } from '@/services/riderService';
import { orderService } from '@/services/orderService';
import { LiveTrackingMap } from '@/components/tracking/LiveTrackingMap';
import { locationService } from '@/services/locationService';
import {
  Navigation,
  Phone,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  KeyRound,
  ChevronLeft,
  X,
  ShieldCheck,
  ArrowRight,
  Radio
} from 'lucide-react';
import './RiderOrderDetailPage.scss';

export const RiderOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGpsActive, setIsGpsActive] = useState(true);
  const [liveGpsCoords, setLiveGpsCoords] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      const data = await orderService.getOrderById(id);
      setOrder(data);
      setLoading(false);
    };

    fetchOrder();
  }, [id]);

  // Activate location tracking when order is out for delivery
  useEffect(() => {
    if (order?.status === 'out_for_delivery' && isGpsActive) {
      locationService.startLocationTracking(order.id, (loc) => {
        setLiveGpsCoords(loc);
      });
    } else {
      locationService.stopLocationTracking();
    }

    return () => locationService.stopLocationTracking();
  }, [order?.status, isGpsActive, order?.id]);

  const handleStageUpdate = async (stage) => {
    const updated = await orderService.updateOrderStatus(order.id, stage);
    setOrder({ ...updated });
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');

    try {
      await riderService.verifyDeliveryOtp(order.id, enteredOtp);
      setIsSuccess(true);
      setTimeout(() => {
        setIsOtpModalOpen(false);
        navigate('/rider');
      }, 1500);
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired OTP. Please recheck with customer.');
    }
  };

  if (!order && !loading) {
    return (
      <div className="p-4 text-center">
        <h3>Order not found</h3>
        <Link to="/rider" className="btn btn-primary mt-3">Back to Rider Home</Link>
      </div>
    );
  }

  return (
    <div className="rider-order-detail-page">
      {/* Top back */}
      <div className="detail-top-nav">
        <Link to="/rider" className="back-link">
          <ChevronLeft size={16} />
          <span>Back to Rider Hub</span>
        </Link>
      </div>

      {/* Live GPS Delivery Map & Broadcasting Telemetry */}
      <div style={{ marginBottom: '16px' }}>
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
              {isGpsActive ? 'Broadcasting Live GPS Telemetry to Customer' : 'GPS Telemetry Paused'}
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
          height="300px"
          riderName={order?.rider?.name || 'You (Partner)'}
          orderId={order?.id}
        />
      </div>

      {/* Customer & Address Details */}
      <div className="rider-info-card">
        <div className="customer-header-row">
          <div>
            <span className="tag-pill">{order?.deliveryAddress.tag} Delivery</span>
            <h3 className="customer-name">{order?.customer.name}</h3>
            <p className="address-full">{order?.deliveryAddress.line1}, {order?.deliveryAddress.city}</p>
          </div>
          <a href={`tel:${order?.customer.phone}`} className="call-customer-btn">
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
          <span className="val font-semibold">{order?.payment.method} ({order?.payment.status})</span>
          {order?.payment.method.includes('Cash') && (
            <span className="badge badge-warning ml-auto">Collect ₹{order?.billing.grandTotal}</span>
          )}
        </div>
      </div>

      {/* Ordered Items Preview */}
      <div className="rider-info-card">
        <h4 className="card-heading">Package Manifest ({order?.items.length} items)</h4>
        <div className="items-manifest-list">
          {order?.items.map((item, idx) => (
            <div key={idx} className="manifest-row">
              <span className="qty-chip">{item.quantity}x</span>
              <span className="name">{item.name}</span>
              <span className="unit text-muted text-xs">({item.unit})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="rider-action-bar">
        {order?.status === 'rider_assigned' && (
          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={() => handleStageUpdate('picked_up')}
          >
            <span>Confirm Order Picked Up from Hub</span>
          </button>
        )}

        {order?.status === 'picked_up' && (
          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={() => handleStageUpdate('out_for_delivery')}
          >
            <Navigation size={18} />
            <span>Start Delivery Run to Doorstep</span>
          </button>
        )}

        {order?.status === 'out_for_delivery' && (
          <button
            className="btn btn-primary btn-lg btn-full verify-cta"
            onClick={() => setIsOtpModalOpen(true)}
          >
            <KeyRound size={18} />
            <span>Enter Customer OTP & Complete Delivery</span>
          </button>
        )}

        {order?.status === 'delivered' && (
          <div className="delivery-completed-banner">
            <CheckCircle2 size={24} className="text-success" />
            <span>Delivery Completed Successfully</span>
          </div>
        )}
      </div>

      {/* OTP Verification Modal */}
      {isOtpModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content rider-otp-modal">
            <div className="modal-header">
              <h3>Verify Delivery Handover</h3>
              <button className="close-btn" onClick={() => setIsOtpModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p className="otp-modal-sub">
              Ask customer for their 4-digit Delivery OTP shown on their screen.
            </p>

            {otpError && (
              <div className="otp-alert error">
                <AlertCircle size={16} />
                <span>{otpError}</span>
              </div>
            )}

            {isSuccess && (
              <div className="otp-alert success">
                <CheckCircle2 size={16} />
                <span>Delivery verified! Payout recorded.</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtpSubmit}>
              <div className="form-group text-center">
                <input
                  type="text"
                  maxLength={4}
                  className="rider-otp-input"
                  placeholder="• • • •"
                  value={enteredOtp}
                  onChange={e => setEnteredOtp(e.target.value)}
                  autoFocus
                  required
                />
                <div className="form-hint">Tip: Order OTP is {order?.deliveryOtp || '4829'} or demo code 1234</div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full mt-4"
                disabled={enteredOtp.length < 4 || isSuccess}
              >
                <span>Confirm Delivery Handover</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
