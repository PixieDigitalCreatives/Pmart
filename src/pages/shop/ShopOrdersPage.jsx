import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shopService } from '@/services/shopService';
import { orderService } from '@/services/orderService';
import { PaymentStatusBadge } from '@/components/order/PaymentStatusBadge';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  DELIVERY_VERIFICATION_STATUS,
  normalizeOrderStatus
} from '@/types/orderTypes';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Bike,
  Check,
  ChevronRight,
  Banknote,
  ShieldCheck
} from 'lucide-react';
import './ShopOrdersPage.scss';

export const ShopOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      const data = await orderService.getOrders();
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
  }, []);

  const filteredOrders = orders.filter(o => {
    const norm = normalizeOrderStatus(o.orderStatus || o.status);
    if (activeTab === 'preparing' && norm !== ORDER_STATUS.PREPARING && norm !== ORDER_STATUS.CONFIRMED && norm !== ORDER_STATUS.READY_FOR_PICKUP) {
      return false;
    }
    if (activeTab === 'out_for_delivery' && norm !== ORDER_STATUS.OUT_FOR_DELIVERY && norm !== ORDER_STATUS.ARRIVED) {
      return false;
    }
    if (activeTab === 'delivered' && norm !== ORDER_STATUS.DELIVERED) {
      return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return o.id.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q) || o.customer?.phone?.includes(q);
  });

  const getStatusBadge = (order) => {
    const norm = normalizeOrderStatus(order.orderStatus || order.status);
    switch (norm) {
      case ORDER_STATUS.DELIVERED:
        return <span className="badge badge-success">Delivered</span>;
      case ORDER_STATUS.ARRIVED:
        return <span className="badge badge-info" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>Arrived</span>;
      case ORDER_STATUS.OUT_FOR_DELIVERY:
        return <span className="badge badge-primary">Out for Delivery</span>;
      case ORDER_STATUS.READY_FOR_PICKUP:
        return <span className="badge badge-info">Ready for Pickup</span>;
      case ORDER_STATUS.PREPARING:
        return <span className="badge badge-warning">Preparing</span>;
      case ORDER_STATUS.CONFIRMED:
        return <span className="badge badge-warning">Confirmed</span>;
      default:
        return <span className="badge badge-neutral">Placed</span>;
    }
  };

  return (
    <div className="shop-orders-page">
      <div className="orders-header-row">
        <div>
          <h1 className="page-heading">Darkstore Order Management</h1>
          <p className="page-sub">Manage live packaging, rider assignment and dispatch</p>
        </div>
      </div>

      {/* Tabs & Search Toolbar */}
      <div className="orders-toolbar-card">
        <div className="tabs-row">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'preparing', label: 'Preparing' },
            { id: 'out_for_delivery', label: 'Out for Delivery' },
            { id: 'delivered', label: 'Completed' }
          ].map(t => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search order ID, customer phone or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="pmart-table-wrapper">
        <table className="pmart-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Order Status</th>
              <th>Payment Status</th>
              <th>Delivery OTP</th>
              <th>Rider</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-muted">
                  No orders found in this view.
                </td>
              </tr>
            ) : (
              filteredOrders.map(o => {
                const isCollected = o.paymentStatus === PAYMENT_STATUS.COLLECTED;
                const isVerified = o.deliveryVerificationStatus === DELIVERY_VERIFICATION_STATUS.OTP_VERIFIED;
                return (
                  <tr key={o.id}>
                    <td>
                      <span className="font-bold text-dark">#{o.id}</span>
                    </td>
                    <td>
                      <div>
                        <div className="font-medium text-dark">{o.customer?.name}</div>
                        <div className="text-muted text-xs">{o.customer?.phone}</div>
                      </div>
                    </td>
                    <td>
                      <span className="font-bold">₹{o.billing?.grandTotal}</span>
                    </td>
                    <td>{getStatusBadge(o)}</td>
                    <td>
                      <span
                        className={`badge ${isCollected ? 'badge-success' : 'badge-warning'}`}
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                      >
                        {isCollected ? 'COLLECTED ✓' : 'PENDING'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${isVerified ? 'badge-success' : 'badge-neutral'}`}
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                      >
                        {isVerified ? 'VERIFIED ✓' : 'OTP PENDING'}
                      </span>
                    </td>
                    <td>
                      {o.rider ? (
                        <span className="text-sm font-medium">{o.rider.name}</span>
                      ) : (
                        <span className="text-xs text-muted">Not assigned</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/shop/orders/${o.id}`} className="btn btn-secondary btn-sm">
                        <Eye size={13} />
                        <span>Order Detail</span>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
