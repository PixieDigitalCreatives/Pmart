import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { mockRiders } from '@/data/mockRiders';
import { ShopTrackRiderModal } from '@/components/shop/ShopTrackRiderModal';
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
  Navigation
} from 'lucide-react';
import './ShopOrderDetailPage.scss';

export const ShopOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [isTrackRiderOpen, setIsTrackRiderOpen] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      const data = await orderService.getOrderById(id);
      setOrder(data);
      if (data?.rider) setSelectedRiderId(data.rider.id);
      setLoading(false);
    };

    fetchOrder();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    const updated = await orderService.updateOrderStatus(order.id, newStatus);
    setOrder({ ...updated });
    setActionNotice(`Order status successfully updated to "${newStatus.replace('_', ' ')}"`);
    setTimeout(() => setActionNotice(''), 3000);
  };

  const handleAssignRider = (e) => {
    e.preventDefault();
    const riderObj = mockRiders.find(r => r.id === selectedRiderId);
    if (riderObj) {
      const updated = { ...order, rider: riderObj, status: 'rider_assigned' };
      setOrder(updated);
      setActionNotice(`Rider ${riderObj.name} assigned to Order #${order.id}`);
      setTimeout(() => setActionNotice(''), 3000);
    }
  };

  if (!order && !loading) {
    return (
      <div className="p-6">
        <h3>Order not found</h3>
        <Link to="/shop/orders" className="btn btn-primary mt-4">Back to Orders</Link>
      </div>
    );
  }

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
            <span className="badge badge-primary status-chip">
              {order?.status?.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          {order?.status === 'out_for_delivery' && (
            <button
              type="button"
              className="btn btn-primary btn-sm track-rider-top-btn"
              onClick={() => setIsTrackRiderOpen(true)}
            >
              <Navigation size={14} />
              <span>Track Rider</span>
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div className="action-notification-banner">
          <Check size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

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
                  <img src={item.image} alt={item.name} className="item-thumb" />
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
                <span>₹{order?.billing.itemTotal}</span>
              </div>
              <div className="sub-row">
                <span>Delivery Fee</span>
                <span>₹{order?.billing.deliveryFee}</span>
              </div>
              <div className="sub-row total">
                <span>Grand Total</span>
                <span>₹{order?.billing.grandTotal}</span>
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
            <p className="actions-subtext">Progress the order through darkstore packaging stages</p>

            <div className="action-buttons-stack">
              <button
                className="btn btn-secondary btn-full stage-btn"
                onClick={() => handleStatusChange('accepted')}
                disabled={order?.status !== 'placed'}
              >
                1. Accept Order
              </button>
              <button
                className="btn btn-secondary btn-full stage-btn"
                onClick={() => handleStatusChange('preparing')}
                disabled={order?.status === 'ready' || order?.status === 'out_for_delivery' || order?.status === 'delivered'}
              >
                2. Mark as Preparing / In Packing
              </button>
              <button
                className="btn btn-primary btn-full stage-btn"
                onClick={() => handleStatusChange('ready')}
                disabled={order?.status === 'ready' || order?.status === 'out_for_delivery' || order?.status === 'delivered'}
              >
                3. Mark Ready for Rider Pickup
              </button>
            </div>
          </div>

          {/* Rider Assignment Box */}
          <div className="detail-card rider-assignment-card">
            <h3 className="card-heading">Delivery Partner Assignment</h3>
            <form onSubmit={handleAssignRider}>
              <div className="form-group">
                <label>Select Available Rider</label>
                <select
                  className="form-select"
                  value={selectedRiderId}
                  onChange={e => setSelectedRiderId(e.target.value)}
                >
                  <option value="">-- Choose Rider --</option>
                  {mockRiders.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.vehicleNumber}) — {r.status === 'available' ? '🟢 Available' : '🟡 On Delivery'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-dark btn-full"
                disabled={!selectedRiderId}
              >
                Assign Fleet Partner
              </button>
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

                {order?.status === 'out_for_delivery' && (
                  <button
                    type="button"
                    className="btn btn-outline-red btn-sm btn-full mt-3"
                    onClick={() => setIsTrackRiderOpen(true)}
                  >
                    <Navigation size={14} />
                    <span>Track Rider Live</span>
                  </button>
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
