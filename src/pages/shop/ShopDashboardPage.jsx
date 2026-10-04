import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shopService } from '@/services/shopService';
import {
  ShoppingBag,
  Clock,
  ChefHat,
  Bike,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import './ShopDashboardPage.scss';

export const ShopDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      const m = await shopService.getShopMetrics();
      const o = await shopService.getShopOrders();
      setMetrics(m);
      setOrders(o);
      setLoading(false);
    };

    loadDashboard();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <span className="badge badge-success">Delivered</span>;
      case 'out_for_delivery':
        return <span className="badge badge-primary">Out for Delivery</span>;
      case 'preparing':
        return <span className="badge badge-warning">Preparing</span>;
      case 'ready':
        return <span className="badge badge-info">Ready to Dispatch</span>;
      default:
        return <span className="badge badge-neutral">Order Placed</span>;
    }
  };

  return (
    <div className="shop-dashboard-page">
      {/* Top Header */}
      <div className="dashboard-page-header">
        <div>
          <h1 className="dash-title">Darkstore Operations Dashboard</h1>
          <p className="dash-subtitle">Real-time fulfillment metrics for P Mart Sasaram Hub (GT Road)</p>
        </div>
        <Link to="/shop/products/new" className="btn btn-primary">
          + Add New Product
        </Link>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-cards-grid">
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">Today's Orders</span>
            <div className="kpi-icon-box red">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="kpi-metric">{metrics?.todayOrders || 148}</div>
          <div className="kpi-trend positive">
            <TrendingUp size={13} />
            <span>+14.2% vs yesterday</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">Pending Acceptance</span>
            <div className="kpi-icon-box amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-metric">{metrics?.pendingOrders || 12}</div>
          <div className="kpi-trend">
            <span>Avg response: 45 secs</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">In Preparation</span>
            <div className="kpi-icon-box blue">
              <ChefHat size={18} />
            </div>
          </div>
          <div className="kpi-metric">{metrics?.preparingOrders || 6}</div>
          <div className="kpi-trend">
            <span>Packing bay queue normal</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">Out for Delivery</span>
            <div className="kpi-icon-box green">
              <Bike size={18} />
            </div>
          </div>
          <div className="kpi-metric">{metrics?.outForDelivery || 0}</div>
          <div className="kpi-trend positive">
            <span>{metrics?.outForDelivery || 0} fleet riders active</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">Today's Revenue</span>
            <div className="kpi-icon-box charcoal">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-metric">₹{metrics?.todayRevenue?.toLocaleString('en-IN') || '48,920'}</div>
          <div className="kpi-trend positive">
            <TrendingUp size={13} />
            <span>+8.4% target met</span>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="recent-orders-section">
        <div className="section-head-bar">
          <div>
            <h3 className="section-heading">Recent Orders Queue</h3>
            <p className="section-sub">Incoming orders requiring fulfillment and packing</p>
          </div>
          <Link to="/shop/orders" className="view-all-link">
            <span>View All Orders</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items Count</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Assigned Rider</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span className="font-semibold text-dark">#{o.id}</span>
                  </td>
                  <td>
                    <div className="customer-cell">
                      <div className="cust-name">{o.customer.name}</div>
                      <div className="cust-phone">{o.customer.phone}</div>
                    </div>
                  </td>
                  <td>{o.items.length} items</td>
                  <td>
                    <span className="font-bold">₹{o.totalAmount || o.billing?.grandTotal || 0}</span>
                  </td>
                  <td>
                    <span className="text-secondary text-sm">{o.payment.method}</span>
                  </td>
                  <td>{getStatusBadge(o.status)}</td>
                  <td>
                    {o.rider ? (
                      <div className="rider-cell">
                        <Bike size={14} className="rider-icon" />
                        <span>{o.rider.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted text-sm">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className="text-muted text-xs">
                      {new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td>
                    <Link to={`/shop/orders/${o.id}`} className="btn btn-secondary btn-sm action-view-btn">
                      <Eye size={13} />
                      <span>Manage</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Highlights Cards */}
      <div className="operational-cards-grid mt-6">
        <div className="ops-card">
          <h4 className="ops-title">Fulfillment SLA Breakdown</h4>
          <div className="sla-progress-list">
            <div className="sla-row">
              <span className="label">Order Acceptance (&lt;60s)</span>
              <span className="val">99.4% on time</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: '99.4%', backgroundColor: '#10B981' }} />
            </div>

            <div className="sla-row">
              <span className="label">Order Packing (&lt;3 mins)</span>
              <span className="val">98.1% on time</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: '98.1%', backgroundColor: '#10B981' }} />
            </div>

            <div className="sla-row">
              <span className="label">Rider Handover (&lt;2 mins)</span>
              <span className="val">97.8% on time</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: '97.8%', backgroundColor: '#F20D18' }} />
            </div>
          </div>
        </div>

        <div className="ops-card">
          <h4 className="ops-title">Inventory Low Stock Alerts</h4>
          <div className="low-stock-list">
            <div className="stock-alert-item">
              <div className="stock-info">
                <span className="item-name">Amul Taaza Milk 1L</span>
                <span className="stock-level">Only 12 packs remaining</span>
              </div>
              <span className="badge badge-error">Restock Now</span>
            </div>
            <div className="stock-alert-item">
              <div className="stock-info">
                <span className="item-name">Mother Dairy Classic Dahi 400g</span>
                <span className="stock-level">Only 8 tubs remaining</span>
              </div>
              <span className="badge badge-warning">Low Stock</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
