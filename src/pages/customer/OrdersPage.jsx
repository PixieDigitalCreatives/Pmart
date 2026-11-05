import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { useCart } from '@/context/CartContext';
import { PaymentStatusBadge } from '@/components/order/PaymentStatusBadge';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, ACTIVE_ORDER_STATUSES, PAST_ORDER_STATUSES } from '@/types/orderTypes';
import { TbRefresh as RefreshCw, TbEye as Eye, TbPackageOff as PackageX, TbPackage as Package } from 'react-icons/tb';
import { PageHeader, Button, EmptyState, Card, StatusBadge, LoadingState } from '@/components/ui';
import './OrdersPage.scss';

const TABS = [
  { id: 'all', label: 'All orders', status: undefined },
  { id: 'active', label: 'In progress', status: ACTIVE_ORDER_STATUSES.join(',') },
  { id: 'past', label: 'Past orders', status: PAST_ORDER_STATUSES.join(',') }
];

export const OrdersPage = () => {
  const { addItem, setIsCartOpen } = useCart();
  const [tab, setTab] = useState('all');
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (page = 1) => {
      const status = TABS.find((t) => t.id === tab).status;
      const res = await orderService.getOrders({ status, page, limit: 10 });
      setOrders(res.orders);
      setPagination(res.pagination);
      setLoading(false);
    },
    [tab]
  );

  useEffect(() => {
    setLoading(true);
    load(1).catch(() => setLoading(false));
    const interval = setInterval(() => load(pagination.page).catch(() => {}), 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const reorder = (order) => {
    order.items.forEach((item) => addItem({ _id: item.product, name: item.name, price: item.price, mrp: item.mrp, unit: item.unit, imageUrl: item.imageUrl }, item.quantity));
    setIsCartOpen(true);
  };

  return (
    <div className="pmart-orders-page">
      <div className="container">
        <PageHeader title="My orders" subtitle="Track deliveries and reorder your regulars" />

        <div className="orders-filter-tabs">
          {TABS.map((t) => (
            <Button key={t.id} className={`filter-tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <span>{t.label}</span>
            </Button>
          ))}
        </div>

        {loading ? (
          <LoadingState text="Loading orders..." />
        ) : orders.length === 0 ? (
          <div style={{ marginTop: '32px' }}>
            <EmptyState icon={PackageX} title="No orders here yet" description="Orders you place will appear here." action={<Button component={Link} to="/" variant="primary">Start shopping</Button>} />
          </div>
        ) : (
          <div className="orders-cards-list">
            {orders.map((order) => (
              <Card key={order._id} className="order-history-card">
                <div className="order-card-header">
                  <div className="order-meta-group">
                    <span className="order-id">#{order.orderNumber}</span>
                    <span className="dot">•</span>
                    <span className="order-date">
                      {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="status-wrap">
                    <StatusBadge status={ORDER_STATUS_LABELS[order.status] || order.status} type={ORDER_STATUS_TONE[order.status] || 'neutral'} />
                  </div>
                </div>

                <div className="order-items-preview">
                  <div className="item-thumbnails-group">
                    {order.items.slice(0, 4).map((item) => (
                      <div key={String(item.product)} className="thumb-box" title={item.name}>
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <Package size={20} className="text-gray-400" />}
                      </div>
                    ))}
                    {order.items.length > 4 && <div className="more-count">+{order.items.length - 4}</div>}
                  </div>
                  <div className="items-text-summary">
                    <div className="summary-names">{order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</div>
                    <div className="items-total-tag">
                      Total: <strong>₹{order.totalAmount}</strong> • {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                </div>

                <div className="order-card-footer">
                  <div className="footer-left">
                    <PaymentStatusBadge paymentStatus={order.paymentStatus} orderStatus={order.status} paymentMethod={order.paymentMethod} amount={order.totalAmount} compact />
                  </div>
                  <div className="footer-actions" style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" size="sm" className="reorder-btn" onClick={() => reorder(order)}>
                      <RefreshCw size={13} style={{ marginRight: '4px' }} />
                      <span>Reorder</span>
                    </Button>
                    <Button component={Link} to={`/orders/${order._id}`} variant={ACTIVE_ORDER_STATUSES.includes(order.status) ? 'primary' : 'outline'} size="sm">
                      <Eye size={13} style={{ marginRight: '4px' }} />
                      <span>{ACTIVE_ORDER_STATUSES.includes(order.status) ? 'Track order' : 'View order'}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {pagination.pages > 1 && (
              <div className="actions-row" style={{ justifyContent: 'center' }}>
                <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>
                  Previous
                </Button>
                <span className="muted-note">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
