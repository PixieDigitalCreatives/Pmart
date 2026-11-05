import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { shopService } from '@/services/shopService';
import { orderService } from '@/services/orderService';
import { openSocket } from '@/services/socket';
import { useMyShop } from '@/components/shop/ShopLayout';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/types/orderTypes';
import { TbChevronRight as ChevronRight, TbEye as Eye, TbBox as PackageOpen, TbAlertTriangle as AlertTriangle, TbPlus as Plus } from 'react-icons/tb';
import { PageHeader, Button, StatusBadge, Card, LoadingState, EmptyState } from '@/components/ui';
import './ShopDashboardPage.scss';

const OPEN_STATUSES = 'PENDING,ACCEPTED,PREPARING,READY,ASSIGNED,PICKED_UP,OUT_FOR_DELIVERY,ARRIVED,DELIVERY_FAILED';

const Kpi = ({ label, value, hint }) => (
  <div className="kpi-tile">
    <div className="kpi-tile-label">{label}</div>
    <div className="kpi-tile-value">{value}</div>
    {hint && <div className="kpi-tile-hint">{hint}</div>}
  </div>
);

export const ShopDashboardPage = () => {
  const { shop } = useMyShop();
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [m, o] = await Promise.all([shopService.getMyMetrics(), orderService.getOrders({ status: OPEN_STATUSES, limit: 10 })]);
      setMetrics(m);
      setOrders(o.orders);
    } catch {
      // The layout shows store-level errors.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // New orders and status changes for this store arrive over the socket.
    const socket = openSocket();
    socket.on('order_status_update', load);
    const interval = setInterval(load, 60000);
    return () => {
      socket.close();
      clearInterval(interval);
    };
  }, [load]);

  if (loading) return <LoadingState text="Loading dashboard..." fullHeight />;

  return (
    <div className="shop-dashboard-page">
      <PageHeader
        title="Store dashboard"
        subtitle={shop ? `${shop.name} • open ${shop.openTime}–${shop.closeTime}` : undefined}
        action={
          <Button component={Link} to="/shop/products/new" variant="primary">
            <Plus size={16} style={{ marginRight: 6 }} />
            Add product
          </Button>
        }
      />

      {metrics && (
        <div className="kpi-grid mb-6">
          <Kpi label="Orders today" value={metrics.todayOrders} hint={metrics.todayCancelled ? `${metrics.todayCancelled} cancelled or rejected` : undefined} />
          <Kpi label="Waiting to accept" value={metrics.pendingOrders} />
          <Kpi label="Accepted / preparing" value={metrics.acceptedOrders + metrics.preparingOrders} />
          <Kpi label="Ready for pickup" value={metrics.readyOrders} />
          <Kpi label="With riders" value={metrics.inDeliveryOrders} />
          <Kpi label="Delivered revenue today" value={`₹${metrics.todayRevenue.toLocaleString('en-IN')}`} />
        </div>
      )}

      <Card className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="section-heading">Open orders</h3>
            <p className="muted-note">Orders that still need action from the store or a rider</p>
          </div>
          <Link to="/shop/orders" className="view-all-link flex items-center gap-1">
            <span>All orders</span>
            <ChevronRight size={16} />
          </Link>
        </div>
        {orders.length === 0 ? (
          <EmptyState icon={PackageOpen} title="No open orders" description="New orders will appear here automatically." />
        ) : (
          <div className="pmart-table-wrapper">
            <table className="pmart-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Rider</th>
                  <th>Placed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td className="font-semibold">#{o.orderNumber}</td>
                    <td>
                      <div>{o.customer?.name}</div>
                      <div className="muted-note">{o.customer?.phone}</div>
                    </td>
                    <td>{o.itemCount}</td>
                    <td className="font-bold">₹{o.totalAmount}</td>
                    <td>
                      <StatusBadge status={ORDER_STATUS_LABELS[o.status]} type={ORDER_STATUS_TONE[o.status]} />
                    </td>
                    <td>{o.rider?.name || <span className="muted-note">Not assigned</span>}</td>
                    <td>{new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <Button component={Link} to={`/shop/orders/${o._id}`} variant="secondary" size="sm">
                        <Eye size={13} style={{ marginRight: 4 }} />
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {metrics && (
        <Card>
          <h3 className="section-heading mb-1">Low stock</h3>
          <p className="muted-note mb-3">Active products with {metrics.lowStockThreshold} or fewer units left</p>
          {metrics.lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted">All products are above the low-stock level.</p>
          ) : (
            <ul className="space-y-2">
              {metrics.lowStockProducts.map((p) => (
                <li key={p._id} className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={14} className={p.stockCount === 0 ? 'text-error' : 'text-warning'} />
                    {p.name} <span className="muted-note">({p.unit})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={p.stockCount === 0 ? 'Out of stock' : `${p.stockCount} left`} type={p.stockCount === 0 ? 'error' : 'warning'} />
                    <Link to={`/shop/products/${p._id}`} className="text-sm">
                      Restock
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};
