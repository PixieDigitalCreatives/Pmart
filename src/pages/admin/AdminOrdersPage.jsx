import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  DELIVERY_VERIFICATION_STATUS,
  normalizeOrderStatus
} from '../../types/orderTypes';
import { Search, Filter, Eye, Download, ChevronRight, Check, Play, Package, Bike } from 'lucide-react';
import { ExportDataModal } from '../../components/admin/ExportDataModal';
import { AssignRiderModal } from '../../components/admin/AssignRiderModal';
import api from '../../services/apiClient';
import './AdminOrdersPage.scss';

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [assignRiderOrderId, setAssignRiderOrderId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/admin/orders', {
        params: {
          page,
          limit: 20,
          status: statusFilter,
          search
        }
      });
      setOrders(res.data.orders);
      setTotalPages(res.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch admin orders', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // 10s poll
    return () => clearInterval(interval);
  }, [page, statusFilter, search]);

  const handleAction = async (orderId, actionStr) => {
    try {
      let status;
      if (actionStr === 'approve') status = ORDER_STATUS.ACCEPTED;
      else if (actionStr === 'prepare') status = ORDER_STATUS.PREPARING;
      else if (actionStr === 'ready') status = ORDER_STATUS.READY;
      else if (actionStr === 'reject') status = ORDER_STATUS.REJECTED;
      
      if (status) {
        await api.patch(`/admin/orders/${orderId}/status`, { status });
        fetchOrders(); // Refresh table immediately
      }
    } catch (error) {
      console.error(`Action ${actionStr} failed:`, error);
      alert(`Failed to ${actionStr} order. Please try again.`);
    }
  };

  const handleAssignRider = async (riderId) => {
    if (!assignRiderOrderId) return;
    try {
      await api.patch(`/admin/orders/${assignRiderOrderId}/assign-rider`, { riderId });
      setAssignRiderOrderId(null);
      fetchOrders();
    } catch (error) {
      console.error('Assign rider failed:', error);
      alert('Failed to assign rider. Please try again.');
    }
  };

  const getOrderStatusBadge = (order) => {
    const norm = normalizeOrderStatus(order.status);
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
      case ORDER_STATUS.ASSIGNED:
        return <span className="badge badge-primary" style={{ background: '#eef2ff', color: '#4f46e5', borderColor: '#c7d2fe' }}>ASSIGNED</span>;
      case ORDER_STATUS.READY:
      case ORDER_STATUS.READY_FOR_PICKUP:
        return <span className="badge badge-info">READY FOR PICKUP</span>;
      case ORDER_STATUS.PREPARING:
        return <span className="badge badge-warning">PREPARING</span>;
      case ORDER_STATUS.ACCEPTED:
      case ORDER_STATUS.CONFIRMED:
        return <span className="badge badge-warning">ACCEPTED</span>;
      case ORDER_STATUS.PENDING:
        return <span className="badge badge-neutral">PENDING</span>;
      case ORDER_STATUS.REJECTED:
      case ORDER_STATUS.CANCELLED:
        return <span className="badge badge-danger" style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}>{norm}</span>;
      default:
        return <span className="badge badge-neutral">{norm || 'PENDING'}</span>;
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
            placeholder="Search order ID..."
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
            <option value={ORDER_STATUS.PENDING}>Pending</option>
            <option value={ORDER_STATUS.ACCEPTED}>Accepted</option>
            <option value={ORDER_STATUS.PREPARING}>Preparing</option>
            <option value={ORDER_STATUS.READY}>Ready for Pickup</option>
            <option value={ORDER_STATUS.ASSIGNED}>Rider Assigned</option>
            <option value={ORDER_STATUS.PICKED_UP}>Picked Up</option>
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
            {orders.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-8 text-muted">
                  No orders match current filters.
                </td>
              </tr>
            ) : (
              orders.filter(o => paymentFilter === 'all' || o.paymentStatus === paymentFilter).map(o => {
                const isCollected = o.paymentStatus === PAYMENT_STATUS.COLLECTED || o.paymentStatus === 'COMPLETED';
                const isVerified = o.deliveryVerificationStatus === 'OTP_VERIFIED';
                return (
                  <tr key={o._id}>
                    <td>
                      <span className="font-bold text-dark">#{o.orderNumber || o._id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <div className="font-medium text-dark">{o.customer?.name || 'Unknown'}</div>
                        <div className="text-muted text-xs">{o.customer?.phone}</div>
                      </div>
                    </td>
                    <td>
                      <span className="font-bold">₹{o.totalAmount}</span>
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
                      <div className="flex gap-2 items-center flex-wrap" style={{ minWidth: '200px' }}>
                        {o.status === ORDER_STATUS.PENDING && (
                          <>
                            <button onClick={() => handleAction(o._id, 'approve')} className="btn btn-primary btn-sm">Accept Order</button>
                            <button onClick={() => handleAction(o._id, 'reject')} className="btn btn-danger btn-sm">Reject</button>
                          </>
                        )}
                        {(o.status === ORDER_STATUS.ACCEPTED || o.status === ORDER_STATUS.CONFIRMED) && (
                          <button onClick={() => handleAction(o._id, 'prepare')} className="btn btn-warning btn-sm">Start Preparing</button>
                        )}
                        {o.status === ORDER_STATUS.PREPARING && (
                          <button onClick={() => handleAction(o._id, 'ready')} className="btn btn-info btn-sm text-white">Mark Ready</button>
                        )}
                        {o.status === ORDER_STATUS.READY && (
                          <button onClick={() => setAssignRiderOrderId(o._id)} className="btn btn-primary btn-sm">Assign Rider</button>
                        )}
                        {o.status === ORDER_STATUS.ASSIGNED && (
                          <div className="text-xs text-muted flex flex-col gap-1">
                            <span className="font-semibold text-amber">Waiting for rider pickup</span>
                            <button onClick={() => setAssignRiderOrderId(o._id)} className="btn btn-secondary btn-sm">Re-assign Rider</button>
                          </div>
                        )}
                        {o.status === ORDER_STATUS.PICKED_UP && (
                          <span className="text-xs text-info font-semibold">Rider has picked up</span>
                        )}
                        {o.status === ORDER_STATUS.OUT_FOR_DELIVERY && (
                          <span className="text-xs text-primary font-semibold">Rider on the way</span>
                        )}
                        {o.status === ORDER_STATUS.ARRIVED && (
                          <span className="text-xs text-warning font-semibold">Pending Payment/OTP</span>
                        )}
                        
                        <Link to={`/admin/orders/${o._id}`} className="btn btn-secondary btn-sm p-1 ml-auto" title="View details">
                          <Eye size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-gray-500">Page {page} of {totalPages || 1}</span>
        <div className="flex gap-2">
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <ExportDataModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Central Orders Audit"
        description="Filter and package orders data for accounting & logistics"
        defaultFilename="PMart_Orders_Master"
      />
      
      <AssignRiderModal 
        isOpen={!!assignRiderOrderId}
        orderId={assignRiderOrderId}
        onClose={() => setAssignRiderOrderId(null)}
        onAssign={handleAssignRider}
      />
    </div>
  );
};
