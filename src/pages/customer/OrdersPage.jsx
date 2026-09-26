import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { useCart } from '@/context/CartContext';
import { PaymentStatusBadge } from '@/components/order/PaymentStatusBadge';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  normalizeOrderStatus
} from '@/types/orderTypes';
import {
  Package,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Eye,
  Navigation,
  Calendar
} from 'lucide-react';
import './OrdersPage.scss';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const { addItem, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      setLoading(true);
      const data = await orderService.getOrders({ status: activeTab });
      if (isMounted) {
        setOrders(data);
        setLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeTab]);

  const handleReorder = (order) => {
    order.items.forEach((item) => {
      addItem(item, item.quantity);
    });
    setIsCartOpen(true);
  };

  const getStatusBadge = (order) => {
    const norm = normalizeOrderStatus(order.orderStatus || order.status);
    switch (norm) {
      case ORDER_STATUS.DELIVERED:
        return (
          <span className="order-status-pill delivered">
            <span className="dot green" />
            <span>Delivered</span>
          </span>
        );
      case ORDER_STATUS.ARRIVED:
        return (
          <span className="order-status-pill arrived">
            <span className="dot blue" />
            <span>Rider Arrived</span>
          </span>
        );
      case ORDER_STATUS.OUT_FOR_DELIVERY:
        return (
          <span className="order-status-pill active-run">
            <span className="dot pulse" />
            <span>Out for Delivery</span>
          </span>
        );
      case ORDER_STATUS.READY_FOR_PICKUP:
        return (
          <span className="order-status-pill ready">
            <span className="dot blue" />
            <span>Ready for Pickup</span>
          </span>
        );
      case ORDER_STATUS.PREPARING:
        return (
          <span className="order-status-pill preparing">
            <span className="dot amber" />
            <span>Preparing</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="order-status-pill cancelled">
            <span className="dot red" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="order-status-pill placed">
            <span className="dot amber" />
            <span>Order Placed</span>
          </span>
        );
    }
  };

  return (
    <div className="pmart-orders-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">Track active grocery deliveries or reorder your regular favorites</p>
        </div>

        {/* Filter Tabs */}
        <div className="orders-filter-tabs">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'out_for_delivery', label: 'Active Deliveries' },
            { id: 'delivered', label: 'Past Orders' }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`filter-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="no-orders-box">
            <Package size={44} className="no-orders-icon" />
            <h3>No orders found in this section</h3>
            <p>Start filling your cart with fresh fruits, dairy and everyday essentials.</p>
            <Link to="/" className="btn btn-primary mt-4">Start Shopping</Link>
          </div>
        ) : (
          <div className="orders-cards-list">
            {orders.map((order) => {
              const norm = normalizeOrderStatus(order.orderStatus || order.status);
              const isActive = norm === ORDER_STATUS.OUT_FOR_DELIVERY || norm === ORDER_STATUS.ARRIVED || norm === ORDER_STATUS.PREPARING || norm === ORDER_STATUS.READY_FOR_PICKUP;

              return (
                <div key={order.id} className="order-history-card">
                  {/* Card Header: ID, Date, Status */}
                  <div className="order-card-header">
                    <div className="order-meta-group">
                      <span className="order-id">#{order.id}</span>
                      <span className="dot">•</span>
                      <span className="order-date">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="status-wrap">{getStatusBadge(order)}</div>
                  </div>

                  {/* Items Preview */}
                  <div className="order-items-preview">
                    <div className="item-thumbnails-group">
                      {order.items.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="thumb-box" title={item.name}>
                          <img src={item.image} alt={item.name} />
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="more-count">+{order.items.length - 4}</div>
                      )}
                    </div>
                    <div className="items-text-summary">
                      <div className="summary-names">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>
                      <div className="items-total-tag">
                        Total: <strong>₹{order.billing?.grandTotal}</strong> • {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="order-card-footer">
                    <div className="footer-left">
                      <PaymentStatusBadge
                        paymentStatus={order.paymentStatus}
                        paymentMethod={order.paymentMethod || order.payment?.method || 'COD'}
                        amount={order.billing?.grandTotal}
                        compact={true}
                      />
                    </div>
                    <div className="footer-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm reorder-btn"
                        onClick={() => handleReorder(order)}
                      >
                        <RefreshCw size={13} />
                        <span>Reorder</span>
                      </button>

                      {/* Dedicated View Order Button */}
                      <Link
                        to={`/orders/${order.id}`}
                        className="btn btn-outline-secondary btn-sm view-order-btn"
                      >
                        <Eye size={13} />
                        <span>View Order</span>
                      </Link>

                      {/* Track Order CTA for Active Deliveries */}
                      {isActive && (
                        <Link
                          to={`/orders/${order.id}`}
                          className="btn btn-primary btn-sm track-order-btn"
                        >
                          <Navigation size={13} />
                          <span>Track Order</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
