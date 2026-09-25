import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { useCart } from '@/context/CartContext';
import {
  Package,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import './OrdersPage.scss';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const { addItem, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const data = await orderService.getOrders({ status: activeTab });
      setOrders(data);
      setLoading(false);
    };

    fetchOrders();
  }, [activeTab]);

  const handleReorder = (order) => {
    order.items.forEach((item) => {
      addItem(item, item.quantity);
    });
    setIsCartOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <span className="badge badge-success">Delivered</span>;
      case 'out_for_delivery':
        return <span className="badge badge-primary">Out for Delivery</span>;
      case 'preparing':
      case 'ready':
      case 'rider_assigned':
        return <span className="badge badge-warning">Preparing</span>;
      case 'cancelled':
        return <span className="badge badge-error">Cancelled</span>;
      default:
        return <span className="badge badge-neutral">Order Placed</span>;
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
              {tab.label}
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
            {orders.map((order) => (
              <div key={order.id} className="order-history-card">
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
                  <div className="status-wrap">{getStatusBadge(order.status)}</div>
                </div>

                {/* Items preview */}
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
                      Total: <strong>₹{order.billing.grandTotal}</strong> • {order.items.length} items
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="order-card-footer">
                  <div className="footer-left">
                    <span className="payment-note">{order.payment.method} ({order.payment.status})</span>
                  </div>
                  <div className="footer-actions">
                    <button
                      className="btn btn-secondary btn-sm reorder-btn"
                      onClick={() => handleReorder(order)}
                    >
                      <RefreshCw size={13} />
                      <span>Reorder</span>
                    </button>
                    <Link to={`/orders/${order.id}`} className="btn btn-primary btn-sm view-btn">
                      <span>{order.status === 'delivered' ? 'View Details' : 'Track Order'}</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
