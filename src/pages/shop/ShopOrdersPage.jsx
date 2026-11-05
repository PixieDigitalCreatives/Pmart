import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { openSocket } from '@/services/socket';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, paymentDisplay } from '@/types/orderTypes';
import { TbSearch as Search, TbEye as Eye, TbPackages as PackageSearch } from 'react-icons/tb';
import { PageHeader, StatusBadge, Button, EmptyState, Input, LoadingState } from '@/components/ui';
import './ShopOrdersPage.scss';
import { plural } from '@/utils/plural';

const TABS = [
  { id: 'new', label: 'New', status: 'PENDING' },
  { id: 'packing', label: 'Accepted / packing', status: 'ACCEPTED,PREPARING' },
  { id: 'dispatch', label: 'Ready / with rider', status: 'READY,ASSIGNED,PICKED_UP,OUT_FOR_DELIVERY,ARRIVED,DELIVERY_FAILED' },
  { id: 'done', label: 'Delivered', status: 'DELIVERED' },
  { id: 'closed', label: 'Cancelled / rejected', status: 'CANCELLED,REJECTED' },
  { id: 'all', label: 'All', status: undefined }
];

export const ShopOrdersPage = () => {
  const [tab, setTab] = useState('new');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ orders: [], pagination: { pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const status = TABS.find((t) => t.id === tab).status;
    try {
      setData(await orderService.getOrders({ status, search: query || undefined, page, limit: 20 }));
    } finally {
      setLoading(false);
    }
  }, [tab, query, page]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const socket = openSocket();
    socket.on('order_status_update', () => load());
    return () => socket.close();
  }, [load]);

  // Debounce typing into the order-number search.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="shop-orders-page">
      <PageHeader title="Orders" subtitle="Accept, pack and hand over orders to riders" />

      <div className="orders-toolbar flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="tab-bar">
          {TABS.map((t) => (
            <Button key={t.id} size="sm" variant={tab === t.id ? 'dark' : 'secondary'} onClick={() => { setTab(t.id); setPage(1); }}>
              {t.label}
            </Button>
          ))}
        </div>
        <div style={{ minWidth: 240 }}>
          <Input icon={Search} placeholder="Search by order number" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <LoadingState text="Loading orders..." />
      ) : data.orders.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No orders" description="Nothing in this list right now." />
      ) : (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Rider</th>
                <th>Placed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o._id}>
                  <td className="font-bold">#{o.orderNumber}</td>
                  <td>
                    <div>{o.customer?.name}</div>
                    <div className="muted-note">{o.customer?.phone}</div>
                  </td>
                  <td className="font-bold">₹{o.totalAmount}</td>
                  <td>
                    <StatusBadge status={ORDER_STATUS_LABELS[o.status]} type={ORDER_STATUS_TONE[o.status]} />
                  </td>
                  <td>
                    <StatusBadge status={paymentDisplay(o).label} type={paymentDisplay(o).tone} />
                  </td>
                  <td>{o.rider?.name || <span className="muted-note">—</span>}</td>
                  <td className="whitespace-nowrap">{new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <Button component={Link} to={`/shop/orders/${o._id}`} variant="secondary" size="sm">
                      <Eye size={13} style={{ marginRight: 4 }} />
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.pagination.pages > 1 && (
        <div className="actions-row mt-4" style={{ justifyContent: 'flex-end' }}>
          <span className="muted-note">
            Page {page} of {data.pagination.pages} ({plural(data.pagination.total, 'order')})
          </span>
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button size="sm" variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
