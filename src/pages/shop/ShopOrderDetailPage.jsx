import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { adminService } from '@/services/adminService';
import { ShopTrackRiderModal } from '@/components/shop/ShopTrackRiderModal';
import { PaymentStatusBadge } from '@/components/order/PaymentStatusBadge';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  DELIVERY_VERIFICATION_STATUS,
  normalizeOrderStatus
} from '@/types/orderTypes';
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  Bike,
  User,
  MapPin,
  Check,
  XCircle,
  AlertTriangle,
  Package,
  Navigation,
  Lock,
  ShieldCheck,
  Banknote,
  KeyRound
} from 'lucide-react';
import { Button, StatusBadge, Card, Select } from '@/components/ui';
import './ShopOrderDetailPage.scss';

export const ShopOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [isTrackRiderOpen, setIsTrackRiderOpen] = useState(false);
  const [availableRiders, setAvailableRiders] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchOrder = async () => {
      const data = await orderService.getOrderById(id);
      if (isMounted) {
        setOrder(data);
        if (data?.rider) setSelectedRiderId(data.rider.id);
        const riders = await adminService.getEligibleRiders();
        setAvailableRiders(riders);
        setLoading(false);
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    const updated = await orderService.updateOrderStatus(order.id, newStatus);
    setOrder({ ...updated });
    setActionNotice(`Order status successfully updated to "${newStatus.replace(/_/g, ' ')}"`);
    setTimeout(() => setActionNotice(''), 3000);
  };

  const handleAssignRider = async (e) => {
    e.preventDefault();
    const riderObj = availableRiders.find(r => r.id === selectedRiderId);
    if (riderObj) {
      const updated = await orderService.updateOrderData(order.id, {
        rider: riderObj,
        status: ORDER_STATUS.CONFIRMED,
        orderStatus: ORDER_STATUS.CONFIRMED
      });
      setOrder(updated);
      setActionNotice(`Rider ${riderObj.name || riderObj.fullName} assigned to Order #${order.id}`);
      setTimeout(() => setActionNotice(''), 3000);
    }
  };

  if (!order && !loading) {
    return (
      <div className="p-6">
        <h3>Order not found</h3>
        <Link to="/shop/orders" style={{ textDecoration: 'none' }}>
          <Button variant="primary" className="mt-4">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const currentStatus = normalizeOrderStatus(order?.orderStatus || order?.status);
  const isDelivered = currentStatus === ORDER_STATUS.DELIVERED;
  const isArrived = currentStatus === ORDER_STATUS.ARRIVED;
  const isOutForDelivery = currentStatus === ORDER_STATUS.OUT_FOR_DELIVERY;
  const isReady = currentStatus === ORDER_STATUS.READY_FOR_PICKUP;
  const isPreparing = currentStatus === ORDER_STATUS.PREPARING;
  const isConfirmed = currentStatus === ORDER_STATUS.CONFIRMED;
  const isPlaced = currentStatus === ORDER_STATUS.PLACED;
  const isCashCollected = order?.paymentStatus === PAYMENT_STATUS.COLLECTED;
  const isOtpVerified = order?.deliveryVerificationStatus === DELIVERY_VERIFICATION_STATUS.OTP_VERIFIED;

  return (
    <div className="shop-order-detail-page">
      <div className="detail-top-nav">
        <Link to="/shop/orders" className="back-link">
          <ChevronLeft size={16} />
          <span>Back to Orders List</span>
        </Link>
      </div>

      <div className="order-detail-title-card">
        <div className="title-left">
          <div className="order-tag">DARKSTORE FULFILLMENT</div>
          <h1 className="order-heading">Order #{order?.id}</h1>
          <span className="created-time">
            Placed on {new Date(order?.createdAt || Date.now()).toLocaleString()}
          </span>
        </div>

        {/* Current Status Pill & Track Rider Action */}
        <div className="status-indicator-box">
          <div className="flex items-center gap-2">
            <span className="status-label">Current Stage:</span>
            <StatusBadge 
              status={currentStatus.replace(/_/g, ' ')} 
              type={isDelivered ? 'success' : isArrived ? 'info' : isOutForDelivery ? 'primary' : 'warning'} 
            />
          </div>
          {(isOutForDelivery || isArrived) && (
            <Button
              variant="primary"
              size="sm"
              className="track-rider-top-btn"
              onClick={() => setIsTrackRiderOpen(true)}
            >
              <Navigation size={14} style={{ marginRight: '8px' }} />
              <span>Track Rider</span>
            </Button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div className="action-notification-banner">
          <Check size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Dedicated Section 10: COD Payment & Delivery Verification Card */}
      <div className="detail-card cod-verification-card" style={{ marginBottom: '24px' }}>
        <div className="card-header-with-badge" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Banknote size={20} className="text-primary" />
            <span>COD Payment & Delivery Verification</span>
          </h3>
          <PaymentStatusBadge
            paymentStatus={order?.paymentStatus}
            paymentMethod={order?.paymentMethod || 'COD'}
            amount={order?.billing?.grandTotal}
            compact={true}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Order Status</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              {currentStatus.replace(/_/g, ' ')}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Payment Method</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              {order?.paymentMethod || 'COD'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Payment Status</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: isCashCollected ? '#16a34a' : '#d97706', marginTop: '4px' }}>
              {isCashCollected ? 'COLLECTED ✓' : 'PENDING'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Delivery Verification</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: isOtpVerified ? '#16a34a' : '#64748b', marginTop: '4px' }}>
              {isOtpVerified ? 'OTP VERIFIED ✓' : 'OTP PENDING'}
            </div>
          </div>
        </div>

        {/* Real-time State Callouts for Shop Owner */}
        {isArrived && !isCashCollected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef3c7', color: '#92400e', borderRadius: '8px', fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>
            <AlertTriangle size={16} />
            <span>Rider has arrived at customer location. Awaiting cash collection of ₹{order?.billing?.grandTotal}.</span>
          </div>
        )}

        {isArrived && isCashCollected && !isOtpVerified && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#eff6ff', color: '#1e40af', borderRadius: '8px', fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>
            <KeyRound size={16} />
            <span>Cash collected ✓ Rider is verifying customer Delivery OTP. Final delivery completion will trigger upon verification.</span>
          </div>
        )}

        {isDelivered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>
            <CheckCircle2 size={16} />
            <span>Delivery Completed & Verified ✓ ₹{order?.billing?.grandTotal} collected, customer OTP verified successfully.</span>
          </div>
        )}

        {/* Section 10 Rule: Shop owner cannot manually mark as delivered if delivery OTP is not verified */}
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748b' }}>
            <Lock size={14} />
            <span>Manual delivery override is locked. Delivery completion strictly requires customer OTP verification by the rider.</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={true}
            style={{ opacity: 0.65, cursor: 'not-allowed', fontSize: '12px' }}
            title="Shop owners cannot mark an order as delivered without verified customer OTP"
          >
            {isDelivered ? '✓ Order Delivered' : '🔒 Mark Delivered (Requires OTP)'}
          </Button>
        </div>
      </div>

      {/* Main 2-column Grid */}
      <div className="detail-grid">
        {/* Left Column: Items & Customer Details */}
        <div className="detail-left-col">
          {/* Order Items Table */}
          <div className="detail-card">
            <h3 className="card-heading">Packed Items ({order?.items.length})</h3>
            <div className="items-table-list">
              {order?.items.map((item, idx) => (
                <div key={idx} className="item-row">
                  <img src={item.imageUrl || item.image} alt={item.name} className="item-thumb" />
                  <div className="item-info">
                    <div className="name">{item.name}</div>
                    <div className="unit">{item.unit}</div>
                  </div>
                  <div className="qty-tag">Qty: <strong>{item.quantity}</strong></div>
                  <div className="price">₹{item.price * item.quantity}</div>
                </div>
              ))}
            </div>

            <div className="bill-summary-sub">
              <div className="sub-row">
                <span>Items Subtotal</span>
                <span>₹{order?.subTotal || order?.billing?.itemTotal || 0}</span>
              </div>
              <div className="sub-row">
                <span>Delivery Fee</span>
                <span>₹{order?.deliveryFee || order?.billing?.deliveryFee || 0}</span>
              </div>
              <div className="sub-row total">
                <span>Grand Total</span>
                <span>₹{order?.totalAmount || order?.billing?.grandTotal || 0}</span>
              </div>
            </div>
          </div>

          {/* Customer & Address */}
          <div className="detail-card">
            <h3 className="card-heading">Customer & Delivery Address</h3>
            <div className="customer-info-block">
              <div className="customer-row">
                <User size={16} className="icon" />
                <span className="label">Customer Name:</span>
                <span className="val">{order?.customer.name}</span>
              </div>
              <div className="customer-row">
                <span className="icon">📞</span>
                <span className="label">Phone:</span>
                <span className="val">{order?.customer.phone}</span>
              </div>
              <div className="customer-row">
                <MapPin size={16} className="icon" />
                <span className="label">Address:</span>
                <span className="val">{order?.deliveryAddress.line1}, {order?.deliveryAddress.city} - {order?.deliveryAddress.pincode}</span>
              </div>
              {order?.deliveryInstructions && (
                <div className="instructions-callout">
                  <strong>Delivery Note:</strong> {order.deliveryInstructions}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Rider Assignment */}
        <div className="detail-right-col">
          {/* Order Processing Actions */}
          <div className="detail-card actions-card">
            <h3 className="card-heading">Fulfillment Actions</h3>
            <p className="actions-subtext">Progress the darkstore packaging workflow</p>

            <div className="action-buttons-stack">
              <Button
                variant="secondary"
                className="btn-full stage-btn"
                onClick={() => handleStatusChange(ORDER_STATUS.CONFIRMED)}
                disabled={!isPlaced}
              >
                1. Accept Order
              </Button>
              <Button
                variant="secondary"
                className="btn-full stage-btn"
                onClick={() => handleStatusChange(ORDER_STATUS.PREPARING)}
                disabled={!isConfirmed}
              >
                2. Mark as Preparing / In Packing
              </Button>
              <Button
                variant="primary"
                className="btn-full stage-btn"
                onClick={() => handleStatusChange(ORDER_STATUS.READY_FOR_PICKUP)}
                disabled={!isPreparing}
              >
                3. Mark Ready for Rider Pickup
              </Button>
            </div>
          </div>

          {/* Rider Assignment Box */}
          <div className="detail-card rider-assignment-card">
            <h3 className="card-heading">Delivery Partner Assignment</h3>
            <form onSubmit={handleAssignRider}>
              <div className="form-group">
                <label htmlFor="auto-id-needed">Select Available Rider</label>
                <Select
                  className="form-select"
                  value={selectedRiderId}
                  onChange={e => setSelectedRiderId(e.target.value)}
                >
                  <option value="">-- Choose Rider --</option>
                  {availableRiders.length === 0 && <option value="" disabled>No riders found.</option>}
                  {availableRiders.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name || r.fullName} ({r.vehicleNumber}) — {r.availabilityStatus === 'AVAILABLE' ? '🟢 Available' : '🟡 On Delivery'}
                    </option>
                  ))}
                </Select>
              </div>

              <Button
                type="submit"
                variant="dark"
                className="btn-full"
                disabled={!selectedRiderId}
                style={{ width: '100%', marginTop: '16px' }}
              >
                Assign Fleet Partner
              </Button>
            </form>

            {order?.rider && (
              <div className="assigned-rider-snippet mt-4">
                <div className="snippet-title">Currently Assigned:</div>
                <div className="rider-mini-profile">
                  <Bike size={18} className="bike-icon" />
                  <div>
                    <div className="name">{order.rider.name}</div>
                    <div className="vehicle">{order.rider.vehicleType} • {order.rider.vehicleNumber}</div>
                  </div>
                </div>

                {(isOutForDelivery || isArrived) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="btn-full mt-3"
                    onClick={() => setIsTrackRiderOpen(true)}
                    style={{ borderColor: '#ef4444', color: '#ef4444', width: '100%' }}
                  >
                    <Navigation size={14} style={{ marginRight: '8px' }} />
                    <span>Track Rider Live</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ShopTrackRiderModal
        isOpen={isTrackRiderOpen}
        onClose={() => setIsTrackRiderOpen(false)}
        order={order}
      />
    </div>
  );
};
