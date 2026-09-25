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
  }, []);

  const kpis = data?.kpis;

  return (
    <div className="admin-dashboard-page">
      <div className="page-header-block">
        <div>
          <h1 className="main-title">Platform Central Overview</h1>
          <p className="sub-title">Real-time telemetry across 32 Darkstores & Regional Micro-Fulfillment Hubs</p>
        </div>
        <div className="action-buttons-group">
          <Link to="/admin/reports" className="btn btn-secondary btn-sm">
            <span>Download SLA Audit Report</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="card-top">
            <span className="label">Total Orders</span>
            <div className="icon-wrap purple"><ShoppingBag size={18} /></div>
          </div>
          <div className="value">{kpis?.totalOrders?.toLocaleString() || '14,280'}</div>
          <div className="sub-note positive">
            <TrendingUp size={13} />
            <span>+18.4% monthly growth</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="card-top">
            <span className="label">Active In-Flight Orders</span>
            <div className="icon-wrap red"><Clock size={18} /></div>
          </div>
          <div className="value">{kpis?.activeOrders || '42'}</div>
          <div className="sub-note">
            <span>Across all regional darkstores</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="card-top">
            <span className="label">Platform Gross Revenue</span>
            <div className="icon-wrap green"><DollarSign size={18} /></div>
          </div>
          <div className="value">₹{kpis?.totalRevenue?.toLocaleString('en-IN') || '48,92,400'}</div>
          <div className="sub-note positive">
            <span>Today: ₹{kpis?.todayRevenue?.toLocaleString('en-IN') || '2,17,270'}</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="card-top">
            <span className="label">Active Darkstores</span>
            <div className="icon-wrap blue"><Store size={18} /></div>
          </div>
          <div className="value">{data?.shops?.length || 3} Hubs</div>
          <div className="sub-note positive">
            <span>100% operational uptime</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="card-top">
            <span className="label">Registered Customers</span>
            <div className="icon-wrap amber"><Users size={18} /></div>
          </div>
          <div className="value">{kpis?.totalCustomers?.toLocaleString() || '38,400'}</div>
          <div className="sub-note positive">
            <span>+420 new signups today</span>
          </div>
        </div>
      </div>

      {/* SLA Performance Bar */}
      <div className="sla-banner-card">
        <div className="sla-metric-item">
          <span className="label">AVERAGE DELIVERY TIME</span>
          <span className="val">{data?.deliveryPerformance?.avgDeliveryMinutes || '11.8 mins'}</span>
          <span className="hint">SLA standard is &lt;15 mins</span>
        </div>
        <div className="sla-metric-item">
          <span className="label">ON-TIME SUCCESS RATE</span>
          <span className="val text-success">{data?.deliveryPerformance?.onTimeRate || '98.6%'}</span>
          <span className="hint">Threshold: 97.0%</span>
        </div>
        <div className="sla-metric-item">
          <span className="label">CUSTOMER SATISFACTION</span>
          <span className="val text-warning">{data?.deliveryPerformance?.customerSatisfaction || '4.85 / 5'}</span>
          <span className="hint">Based on 12,400+ reviews</span>
        </div>
      </div>

      {/* Darkstore Hub Performance Table */}
      <div className="admin-section-block">
        <div className="block-head">
          <h3 className="block-title">Regional Darkstores Performance</h3>
          <Link to="/admin/shops" className="link-see-all">
            <span>View All Hubs</span>
            <ChevronRight size={15} />
          </Link>
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
              {data?.shops?.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="font-semibold text-dark">{s.name}</div>
                    <div className="text-muted text-xs">Manager: {s.ownerName}</div>
                  </td>
                  <td>{s.city}, {s.state}</td>
                  <td>
                    <span className="font-medium">{s.metrics.todayOrders} orders</span>
                  </td>
                  <td>
                    <span className="font-bold text-dark">₹{s.metrics.todayRevenue?.toLocaleString('en-IN')}</span>
                  </td>
                  <td>{s.activeRidersCount} Riders</td>
                  <td>
                    <span className="font-semibold text-success">{s.metrics.avgFulfillmentTime}</span>
                  </td>
                  <td>
                    <span className="badge badge-success">{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
