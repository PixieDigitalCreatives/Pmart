import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TbCreditCard as CreditCard } from 'react-icons/tb';
import { adminService } from '@/services/adminService';
import { apiErrorMessage } from '@/services/apiClient';
import { useToast } from '@/context/ToastContext';
import { PageHeader, StatusBadge, Select, Button, EmptyState, LoadingState } from '@/components/ui';
import { plural } from '@/utils/plural';

const TONE = { PENDING: 'warning', COLLECTED: 'success', FAILED: 'error', REFUNDED: 'neutral' };

/** Cash-on-delivery ledger derived from orders (cancelled and rejected orders are excluded). */
export const AdminPaymentsPage = () => {
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], summary: {}, pagination: { pages: 1 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminService
      .getPayments({ paymentStatus: status === 'all' ? undefined : status, page })
      .then(setData)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const s = data.summary;
  const tile = (label, key) => (
    <div className="kpi-tile">
      <div className="kpi-tile-label">{label}</div>
      <div className="kpi-tile-value">₹{(s[key]?.amount || 0).toLocaleString('en-IN')}</div>
      <div className="kpi-tile-hint">{plural(s[key]?.count || 0, 'order')}</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Payments" subtitle="Cash on delivery collections" />
      <div className="kpi-grid mb-4">
        {tile('Collected', 'COLLECTED')}
        {tile('To be collected', 'PENDING')}
      </div>
      <div className="mb-3" style={{ width: 220 }}>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">All payment statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COLLECTED">Collected</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </Select>
      </div>
      {loading ? (
        <LoadingState />
      ) : data.rows.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments" description="Payments appear here as orders are placed." />
      ) : (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Collected by</th>
                <th>Collected at</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r._id}>
                  <td>
                    <Link to={`/admin/orders/${r._id}`} className="font-semibold">
                      #{r.orderNumber}
                    </Link>
                  </td>
                  <td>{r.customer?.name}</td>
                  <td className="font-bold">₹{r.totalAmount}</td>
                  <td>{r.paymentMethod}</td>
                  <td>
                    <StatusBadge status={r.paymentStatus} type={TONE[r.paymentStatus]} />
                  </td>
                  <td>{r.paymentStatus === 'COLLECTED' ? r.rider?.name || '—' : '—'}</td>
                  <td>{r.paymentCollectedAt ? new Date(r.paymentCollectedAt).toLocaleString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.pagination.pages > 1 && (
        <div className="actions-row mt-3" style={{ justifyContent: 'flex-end' }}>
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="muted-note">
            {page} / {data.pagination.pages}
          </span>
          <Button size="sm" variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
