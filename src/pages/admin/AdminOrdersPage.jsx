import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/adminService';
import { mockOrders } from '@/data/mockOrders';
import { Search, Filter, Eye, Download, ChevronRight } from 'lucide-react';
import { ExportDataModal } from '@/components/admin/ExportDataModal';
import './AdminOrdersPage.scss';

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState(mockOrders);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.shop.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="admin-orders-page">
      <div className="orders-head-bar">
        <div>
          <h1 className="title">Central Orders Management</h1>
          <p className="subtitle">Real-time audit log of all customer grocery transactions</p>
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

        <div className="filter-dropdowns">
          <select
            className="form-select status-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="placed">Order Placed</option>
            <option value="preparing">Preparing</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="pmart-table-wrapper">
        <table className="pmart-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Fulfillment Hub</th>
              <th>Fleet Rider</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Placed At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td>
                  <span className="font-bold text-dark">#{o.id}</span>
                </td>
                <td>
                  <div className="customer-cell">
                    <div className="font-medium text-dark">{o.customer.name}</div>
                    <div className="text-muted text-xs">{o.customer.phone}</div>
                  </div>
                </td>
                <td>
                  <span className="text-sm">{o.shop.name.replace('PMart Darkstore Hub — ', '')}</span>
                </td>
                <td>
                  {o.rider ? (
                    <span className="text-sm font-medium">{o.rider.name}</span>
                  ) : (
                    <span className="text-muted text-xs">Unassigned</span>
                  )}
                </td>
                <td>
                  <span className="font-bold">₹{o.billing.grandTotal}</span>
                </td>
                <td>
                  <span className="badge badge-neutral text-xs">{o.payment.method}</span>
                </td>
                <td>
                  <span className={`badge ${
                    o.status === 'delivered' ? 'badge-success' :
                    o.status === 'out_for_delivery' ? 'badge-primary' : 'badge-warning'
                  }`}>
                    {o.status.replace('_', ' ')}
                  </span>
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
            ))}
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
