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
  ShieldCheck,
  PackageSearch
} from 'lucide-react';
import { PageHeader, StatusBadge, Button, EmptyState } from '@/components/ui';
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
        return <StatusBadge status="Delivered" type="success" />;
      case ORDER_STATUS.ARRIVED:
        return <StatusBadge status="Arrived" type="info" />;
      case ORDER_STATUS.OUT_FOR_DELIVERY:
        return <StatusBadge status="Out for Delivery" type="primary" />;
      case ORDER_STATUS.READY_FOR_PICKUP:
        return <StatusBadge status="Ready for Pickup" type="info" />;
      case ORDER_STATUS.PREPARING:
        return <StatusBadge status="Preparing" type="warning" />;
      case ORDER_STATUS.CONFIRMED:
        return <StatusBadge status="Confirmed" type="warning" />;
      default:
        return <StatusBadge status="Placed" type="neutral" />;
    }
  };

  return (
    <div className="shop-orders-page">
      <PageHeader 
        title="Darkstore Order Management"
        subtitle="Manage live packaging, rider assignment and dispatch"
      />

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
                <td colSpan="8" style={{ padding: 0 }}>
                  <EmptyState
                    icon={PackageSearch}
                    title="No orders found"
                    description="No orders match your current filters."
                  />
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
                      <StatusBadge 
                        status={isCollected ? 'COLLECTED ✓' : 'PENDING'} 
                        type={isCollected ? 'success' : 'warning'} 
                      />
                    </td>
                    <td>
                      <StatusBadge 
                        status={isVerified ? 'VERIFIED ✓' : 'OTP PENDING'} 
                        type={isVerified ? 'success' : 'neutral'} 
                      />
                    </td>
                    <td>
                      {o.rider ? (
                        <span className="text-sm font-medium">{o.rider.name}</span>
                      ) : (
                        <span className="text-xs text-muted">Not assigned</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/shop/orders/${o.id}`} style={{ textDecoration: 'none' }}>
                        <Button variant="secondary" size="sm">
                          <Eye size={13} style={{ marginRight: '4px' }} />
                          <span>Order Detail</span>
                        </Button>
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
