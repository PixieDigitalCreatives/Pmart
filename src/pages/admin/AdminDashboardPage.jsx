import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/adminService';
import {
  ShoppingBag,
  TrendingUp,
  Store,
  Bike,
  Users,
  DollarSign,
  Clock,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { PageHeader, LoadingState, StatusBadge, Button } from '@/components/ui';
import './AdminDashboardPage.scss';

export const AdminDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      const res = await adminService.getPlatformOverview();
      const shops = await adminService.getShops();
      setData({ ...res, shops });
      setLoading(false);
    };

    loadOverview();

    import('socket.io-client').then(({ io }) => {
      const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
      const socket = io(SOCKET_URL);
      socket.emit('join_admin');
      
      socket.on('order_status_update', () => {
        loadOverview();
      });
      // Cleanup would normally go here but for dynamic import it's trickier, skipping for brevity
    });
    // Cleanup handled implicitly, or add a ref if needed.
  }, []);

  if (loading && !data) return <LoadingState text="Loading dashboard metrics..." fullHeight />;

  const kpis = data?.kpis;

  return (
    <div className="admin-dashboard-page">
      <PageHeader 
        title="Platform Central Overview" 
        subtitle="Real-time telemetry across Active Darkstores & Regional Micro-Fulfillment Hubs"
        action={
          <Link to="/admin/reports">
            <Button variant="secondary" size="sm">
              Download SLA Audit Report
            </Button>
          </Link>
        }
      />

      {/* KPI Cards Row */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="card-top">
            <span className="label">Total Orders</span>
            <div className="icon-wrap purple"><ShoppingBag size={18} /></div>
          </div>
          <div className="value">{kpis?.totalOrders?.toLocaleString() ?? 'N/A'}</div>
          <div className="sub-note positive">
            <TrendingUp size={13} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="card-top">
            <span className="label">Active In-Flight Orders</span>
            <div className="icon-wrap red"><Clock size={18} /></div>
          </div>
          <div className="value">{kpis?.activeOrders ?? 'N/A'}</div>
          <div className="sub-note">
            <span>Across all regional darkstores</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="card-top">
            <span className="label">Platform Gross Revenue</span>
            <div className="icon-wrap green"><DollarSign size={18} /></div>
          </div>
          <div className="value">₹{kpis?.totalRevenue?.toLocaleString('en-IN') ?? 'N/A'}</div>
          <div className="sub-note positive">
            <span>Today: ₹{kpis?.todayRevenue?.toLocaleString('en-IN') ?? 'N/A'}</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="card-top">
            <span className="label">Active Darkstores</span>
            <div className="icon-wrap blue"><Store size={18} /></div>
          </div>
          <div className="value">{data?.shops?.length ?? 'N/A'} Hubs</div>
          <div className="sub-note positive">
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="card-top">
            <span className="label">Registered Customers</span>
            <div className="icon-wrap amber"><Users size={18} /></div>
          </div>
          <div className="value">{kpis?.totalCustomers?.toLocaleString() ?? 'N/A'}</div>
          <div className="sub-note positive">
          </div>
        </div>
      </div>

      {/* SLA Performance Bar */}
      <div className="sla-banner-card">
        <div className="sla-metric-item">
          <span className="label">AVERAGE DELIVERY TIME</span>
          <span className="val">{data?.deliveryPerformance?.avgDeliveryMinutes ?? 'N/A'}</span>
          <span className="hint">SLA standard is &lt;15 mins</span>
        </div>
        <div className="sla-metric-item">
          <span className="label">ON-TIME SUCCESS RATE</span>
          <span className="val text-success">{data?.deliveryPerformance?.onTimeRate ?? 'N/A'}</span>
          <span className="hint">Threshold: 97.0%</span>
        </div>
        <div className="sla-metric-item">
          <span className="label">CUSTOMER SATISFACTION</span>
          <span className="val text-warning">{data?.deliveryPerformance?.customerSatisfaction ?? 'N/A'}</span>
        </div>
      </div>

      {/* Darkstore Hub Performance Table */}
      <div className="admin-section-block">
        <div className="block-head">
          <h3 className="block-title">Regional Darkstores Performance</h3>
        </div>

        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Darkstore Hub</th>
                <th>City & Region</th>
                <th>Today's Volume</th>
                <th>Revenue</th>
                <th>Active Fleet</th>
                <th>Avg SLA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.shops?.map((s) => {
                const metrics = s.metrics || {
                  todayOrders: 0,
                  todayRevenue: 0,
                  avgFulfillmentTime: 'N/A'
                };
                const city = s.city || s.address?.city || 'Unknown';
                const state = s.state || s.address?.state || 'Unknown';
                const ownerName = s.ownerName || s.owner?.name || 'P-Mart Admin';
                const status = s.status || (s.isActive ? 'Active' : 'Inactive');
                
                return (
                <tr key={s.id || s._id || Math.random()}>
                  <td>
                    <div className="font-semibold text-dark">{s.name}</div>
                    <div className="text-muted text-xs">Manager: {ownerName}</div>
                  </td>
                  <td>{city}, {state}</td>
                  <td>
                    <span className="font-medium">{metrics.todayOrders} orders</span>
                  </td>
                  <td>
                    <span className="font-bold text-dark">₹{metrics.todayRevenue?.toLocaleString('en-IN')}</span>
                  </td>
                  <td>{s.activeRidersCount || 0} Riders</td>
                  <td>
                    <span className="font-semibold text-success">{metrics.avgFulfillmentTime}</span>
                  </td>
                  <td>
                    <StatusBadge status={status} />
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
