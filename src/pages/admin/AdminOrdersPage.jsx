import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  DELIVERY_VERIFICATION_STATUS,
  normalizeOrderStatus
} from '@/types/orderTypes';
import { Search, Filter, Eye, Download, ChevronRight } from 'lucide-react';
import { ExportDataModal } from '@/components/admin/ExportDataModal';
import './AdminOrdersPage.scss';

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      const data = await orderService.getOrders();
      if (isMounted) {
        setOrders(data);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const filtered = orders.filter(o => {
    const norm = normalizeOrderStatus(o.orderStatus || o.status);
    if (statusFilter !== 'all' && norm !== statusFilter) return false;
    if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.customer?.name?.toLowerCase().includes(q) ||
        o.shop?.name?.toLowerCase().includes(q) ||
        o.rider?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getOrderStatusBadge = (order) => {
    const norm = normalizeOrderStatus(order.orderStatus || order.status);
    switch (norm) {
      case ORDER_STATUS.DELIVERED:
        return <span className="badge badge-success">DELIVERED</span>;
      case ORDER_STATUS.ARRIVED:
        return (
          <span
            className="badge badge-info"
            style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', fontWeight: 700 }}
          >
            ARRIVED
          </span>
        );
      case ORDER_STATUS.OUT_FOR_DELIVERY:
        return <span className="badge badge-primary">OUT FOR DELIVERY</span>;
      case ORDER_STATUS.READY_FOR_PICKUP:
        return <span className="badge badge-info">READY FOR PICKUP</span>;
      case ORDER_STATUS.PREPARING:
        return <span className="badge badge-warning">PREPARING</span>;
      case ORDER_STATUS.CONFIRMED:
        return <span className="badge badge-warning">CONFIRMED</span>;
      default:
        return <span className="badge badge-neutral">PLACED</span>;
    }
  };

  return (
    <div className="admin-orders-page">
      <div className="orders-head-bar">
        <div>
          <h1 className="title">Central Orders Management</h1>
          <p className="subtitle">Real-time audit log of all customer grocery transactions and COD verifications</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setIsExportOpen(true)}>
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="admin-filters-card">
        <div className="search-field">
          <Search size={16} className="icon" />
          <input
            type="text"
            placeholder="Search order ID, customer name, hub name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-dropdowns" style={{ display: 'flex', gap: '10px' }}>
          <select
            className="form-select status-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Order Stages</option>
            <option value={ORDER_STATUS.PLACED}>Placed</option>
            <option value={ORDER_STATUS.CONFIRMED}>Confirmed</option>
            <option value={ORDER_STATUS.PREPARING}>Preparing</option>
            <option value={ORDER_STATUS.READY_FOR_PICKUP}>Ready for Pickup</option>
            <option value={ORDER_STATUS.OUT_FOR_DELIVERY}>Out for Delivery</option>
            <option value={ORDER_STATUS.ARRIVED}>Arrived at Customer</option>
            <option value={ORDER_STATUS.DELIVERED}>Delivered</option>
          </select>

          <select
            className="form-select status-select"
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
          >
            <option value="all">All Payment Statuses</option>
            <option value={PAYMENT_STATUS.PENDING}>Payment: PENDING</option>
            <option value={PAYMENT_STATUS.COLLECTED}>Payment: COLLECTED</option>
          </select>
        </div>
      </div>

      {/* Table with separated Order Status, Payment Method, Payment Status, Delivery Verification fields */}
      <div className="pmart-table-wrapper">
        <table className="pmart-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Order Status</th>
              <th>Payment Method</th>
              <th>Payment Status</th>
              <th>Delivery Verification</th>
              <th>Rider</th>
              <th>Placed At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-8 text-muted">
                  No orders match current filters.
                </td>
              </tr>
            ) : (
              filtered.map(o => {
                const isCollected = o.paymentStatus === PAYMENT_STATUS.COLLECTED;
                const isVerified = o.deliveryVerificationStatus === DELIVERY_VERIFICATION_STATUS.OTP_VERIFIED;
                return (
                  <tr key={o.id}>
                    <td>
                      <span className="font-bold text-dark">#{o.id}</span>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <div className="font-medium text-dark">{o.customer?.name}</div>
                        <div className="text-muted text-xs">{o.customer?.phone}</div>
                      </div>
                    </td>
                    <td>
                      <span className="font-bold">₹{o.billing?.grandTotal}</span>
                    </td>
                    <td>{getOrderStatusBadge(o)}</td>
                    <td>
                      <span className="badge badge-neutral text-xs font-bold">
                        {o.paymentMethod || 'COD'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${isCollected ? 'badge-success' : 'badge-warning'}`}
                        style={{ fontSize: '11px', fontWeight: 700 }}
                      >
                        {isCollected ? 'COLLECTED' : 'PENDING'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${isVerified ? 'badge-success' : 'badge-neutral'}`}
                        style={{ fontSize: '11px', fontWeight: 700 }}
                      >
                        {isVerified ? 'OTP: VERIFIED' : 'OTP: PENDING'}
                      </span>
                    </td>
                    <td>
                      {o.rider ? (
                        <span className="text-sm font-medium">{o.rider.name}</span>
                      ) : (
                        <span className="text-muted text-xs">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className="text-muted text-xs">
                        {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <Link to={`/orders/${o.id}`} className="btn btn-secondary btn-sm" title="View tracking view">
                        <Eye size={13} />
                        <span>Audit</span>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ExportDataModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Central Orders Audit"
        description="Filter and package orders data for accounting & logistics"
        defaultFilename="PMart_Orders_Master"
      />
    </div>
  );
};
