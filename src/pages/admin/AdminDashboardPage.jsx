import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/adminService';
import { openSocket } from '@/services/socket';
import { useAuth } from '@/context/AuthContext';
import { TbAlertTriangle as AlertTriangle, TbBuildingStore as Store, TbShoppingBag as ShoppingBag, TbPackage as Package, TbUsers as Users } from 'react-icons/tb';
import { PageHeader, LoadingState, Card, Button } from '@/components/ui';
import { plural } from '@/utils/plural';

const Kpi = ({ label, value, hint }) => (
  <div className="kpi-tile">
    <div className="kpi-tile-label">{label}</div>
    <div className="kpi-tile-value">{value}</div>
    {hint && <div className="kpi-tile-hint">{hint}</div>}
  </div>
);

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const AdminDashboardPage = () => {
  const { user, can } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(can('dashboard.read'));
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!can('dashboard.read')) return;
    adminService
      .getDashboard()
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch(() => setError('Could not load dashboard figures.'))
      .finally(() => setLoading(false));
  }, [can]);

  useEffect(() => {
    load();
    if (!can('orders.read')) return undefined;
    const socket = openSocket();
    socket.on('connect', () => socket.emit('join_admin'));
    socket.on('order_status_update', load);
    return () => socket.close();
  }, [load, can]);

  // First-run checklist: what the platform still needs before customers can order.
  const setupSteps = data
    ? [
        { done: data.shops.active > 0, label: 'Create a store', to: '/admin/stores', permission: 'shops.manage' },
        { done: data.riders.available + data.riders.busy + data.riders.offline > 0, label: 'Add delivery riders', to: '/admin/users?tab=riders', permission: 'riders.manage' }
      ].filter((s) => !s.done && can(s.permission))
    : [];

  if (!can('dashboard.read')) {
    return (
      <div>
        <PageHeader title={`Welcome, ${user?.name || ''}`} subtitle="Use the menu to open the sections you have access to." />
        <div className="grid md:grid-cols-3 gap-4">
          {can('orders.read') && <Card><Link to="/admin/orders" className="flex items-center gap-2"><ShoppingBag size={18} /> Orders</Link></Card>}
          {can('catalog.manage') && <Card><Link to="/admin/products" className="flex items-center gap-2"><Package size={18} /> Products</Link></Card>}
          {can('customers.read') && <Card><Link to="/admin/users" className="flex items-center gap-2"><Users size={18} /> Customers</Link></Card>}
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState text="Loading dashboard..." fullHeight />;

  return (
    <div>
      <PageHeader title="Platform overview" subtitle="Live figures across all stores" action={can('reports.read') && <Button component={Link} to="/admin/reports" variant="secondary" size="sm">Reports</Button>} />

      {error && (
        <div className="alert alert-error mb-4">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {setupSteps.length > 0 && (
        <Card className="mb-4">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Store size={18} /> Finish setting up
          </h3>
          <ul className="space-y-1 text-sm">
            {setupSteps.map((s) => (
              <li key={s.label}>
                <Link to={s.to}>{s.label}</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data && (
        <>
          <div className="kpi-grid mb-4">
            <Kpi label="Orders today" value={data.todayOrders} hint={data.todayCancelled ? `${data.todayCancelled} cancelled or rejected` : undefined} />
            <Kpi label="Order value today" value={inr(data.todayBookedValue)} hint="Excludes cancelled and rejected" />
            <Kpi label="Open orders" value={data.activeOrders} hint={`${data.ordersInDelivery} out for delivery`} />
            <Kpi label="Delivered revenue (all time)" value={inr(data.deliveredRevenue)} hint={`${plural(data.totalOrders, 'order')} in total`} />
          </div>
          <div className="kpi-grid">
            <Kpi label="Riders online" value={data.riders.available} hint={`${data.riders.busy} delivering • ${data.riders.offline} offline`} />
            <Kpi label="Active stores" value={data.shops.active} hint={data.shops.inactive ? `${data.shops.inactive} inactive` : undefined} />
            <Kpi label="Customers" value={data.registeredCustomers} />
            <Kpi
              label="Avg. delivery time (30 days)"
              value={data.last30Days.avgDeliveryMinutes != null ? `${data.last30Days.avgDeliveryMinutes} min` : 'No data yet'}
              hint={`${plural(data.last30Days.deliveredOrders, 'delivered order')}`}
            />
          </div>
        </>
      )}
    </div>
  );
};
