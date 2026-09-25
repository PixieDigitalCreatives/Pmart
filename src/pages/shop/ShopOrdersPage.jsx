import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shopService } from '@/services/shopService';
import { orderService } from '@/services/orderService';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Bike,
  Check,
  ChevronRight
} from 'lucide-react';
import './ShopOrdersPage.scss';

export const ShopOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const data = await shopService.getShopOrders(activeTab);
      setOrders(data);
      setLoading(false);
    };

    fetchOrders();
  }, [activeTab]);

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q);
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <span className="badge badge-success">Delivered</span>;
      case 'out_for_delivery':
        return <span className="badge badge-primary">Out for Delivery</span>;
      case 'ready':
        return <span className="badge badge-info">Ready</span>;
      case 'preparing':
        return <span className="badge badge-warning">Preparing</span>;
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
              <th>Destination Address</th>
              <th>Items</th>
              <th>Total Amount</th>
              <th>Status</th>
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
              filteredOrders.map(o => (
                <tr key={o.id}>
                  <td>
                    <span className="font-bold text-dark">#{o.id}</span>
                  </td>
                  <td>
                    <div>
                      <div className="font-medium text-dark">{o.customer.name}</div>
                      <div className="text-muted text-xs">{o.customer.phone}</div>
                    </div>
                  </td>
                  <td>
                    <div className="address-snippet-cell" title={o.deliveryAddress?.line1}>
                      {o.deliveryAddress?.line1?.slice(0, 32)}...
                    </div>
                  </td>
                  <td>{o.items.length} items</td>
                  <td>
                    <span className="font-bold">₹{o.billing.grandTotal}</span>
                  </td>
                  <td>{getStatusBadge(o.status)}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
