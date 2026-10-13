import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/adminService';
import { apiErrorMessage } from '@/services/apiClient';
import { useToast } from '@/context/ToastContext';
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_TONE, paymentDisplay } from '@/types/orderTypes';
import { Search, Eye, Download, Package } from 'lucide-react';
import { PageHeader, StatusBadge, Button, EmptyState, Input, Select, LoadingState } from '@/components/ui';
import './AdminOrdersPage.scss';
import { plural } from '@/utils/plural';

export const AdminOrdersPage = () => {
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ orders: [], pagination: { pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(
        await adminService.getOrders({
          status: status === 'all' ? undefined : status,
          paymentStatus: paymentStatus === 'all' ? undefined : paymentStatus,
          search: query || undefined,
          page,
          limit: 25
        })
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load orders.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paymentStatus, query, page]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await adminService.downloadOrdersCsv({ status: status === 'all' ? undefined : status });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="admin-orders-page">
      <PageHeader
        title="Orders"
        subtitle={plural(data.pagination.total, 'order')}
        action={
          <Button variant="secondary" size="sm" onClick={exportCsv} isLoading={exporting}>
            <Download size={14} style={{ marginRight: 6 }} />
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div style={{ minWidth: 240, flex: 1 }}>
          <Input icon={Search} placeholder="Search by order number" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: 200 }}>
          <option value="all">All statuses</option>
          {Object.values(ORDER_STATUS).map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} style={{ width: 180 }}>
          <option value="all">All payments</option>
          <option value="PENDING">Payment pending</option>
          <option value="COLLECTED">Payment collected</option>
          <option value="FAILED">Payment failed</option>
          <option value="REFUNDED">Refunded</option>
        </Select>
      </div>

      {loading ? (
        <LoadingState text="Loading orders..." />
      ) : data.orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders" description="No orders match these filters." />
      ) : (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Store</th>
                <th>Customer</th>
                <th>Total</th>
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
                  <td>{o.shop?.name}</td>
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
                    <Button component={Link} to={`/admin/orders/${o._id}`} variant="secondary" size="sm">
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
            Page {page} of {data.pagination.pages}
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
