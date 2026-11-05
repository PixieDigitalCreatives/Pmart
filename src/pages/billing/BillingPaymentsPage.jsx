import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TbWallet as Wallet } from 'react-icons/tb';
import { billingService } from '@/services/billingService';
import { apiErrorMessage } from '@/services/apiClient';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Input, Select, LoadingState, EmptyState } from '@/components/ui';
import { Pagination } from '@/components/inventory/Pagination';
import { money, dateTime, PAYMENT_METHODS, methodLabel } from '@/utils/format';
import '@/components/inventory/inventory.scss';

/** Every payment and refund recorded against in-store invoices. */
export const BillingPaymentsPage = () => {
  const toast = useToast();
  const [filters, setFilters] = useState({ search: '', method: '', kind: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ rows: [], summary: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      billingService
        .listPayments({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page })
        .then(setResult)
        .catch((err) => toast.error(apiErrorMessage(err, 'Could not load payments.')))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const set = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1);
  };
  const byMethod = {};
  (result.summary || []).forEach((s) => {
    byMethod[s._id.method] = (byMethod[s._id.method] || 0) + (s._id.kind === 'REFUND' ? -s.amount : s.amount);
  });
  const net = Object.values(byMethod).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title="Payment history" subtitle="Payments and refunds on in-store invoices. Totals follow the filters." />
      <div className="kpi-grid mb-4">
        <div className="kpi-tile">
          <div className="kpi-tile-label">Net collected</div>
          <div className="kpi-tile-value">{money(net)}</div>
          <div className="kpi-tile-hint">{result.pagination.total} entries</div>
        </div>
        {Object.entries(byMethod).map(([m, v]) => (
          <div className="kpi-tile" key={m}>
            <div className="kpi-tile-label">{methodLabel(m)}</div>
            <div className="kpi-tile-value">{money(v)}</div>
          </div>
        ))}
      </div>
      <div className="toolbar">
        <div className="toolbar-grow">
          <Input value={filters.search} onChange={set('search')} placeholder="Invoice no., customer or reference" aria-label="Search payments" />
        </div>
        <Select value={filters.method} onChange={set('method')} aria-label="Method" style={{ width: 150 }}>
          <option value="">Any method</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <Select value={filters.kind} onChange={set('kind')} aria-label="Type" style={{ width: 140 }}>
          <option value="">Payments and refunds</option>
          <option value="PAYMENT">Payments</option>
          <option value="REFUND">Refunds</option>
        </Select>
        <Input type="date" value={filters.from} onChange={set('from')} aria-label="From date" style={{ width: 150 }} />
        <Input type="date" value={filters.to} onChange={set('to')} aria-label="To date" style={{ width: 150 }} />
      </div>
      {loading ? (
        <LoadingState />
      ) : result.rows.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments" description="Payments recorded on invoices appear here." />
      ) : (
        <div className="pmart-table-wrapper overflow-x-auto">
          <table className="pmart-table is-dense">
            <thead>
              <tr>
                <th>Received</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Method</th>
                <th>Reference</th>
                <th className="num">Amount</th>
                <th>Recorded by</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((p) => (
                <tr key={p._id}>
                  <td className="whitespace-nowrap">{dateTime(p.receivedAt)}</td>
                  <td className="mono">
                    <Link to={`/admin/billing/invoices/${p.invoice}`}>{p.invoiceNumber}</Link>
                  </td>
                  <td>{p.customerName || 'Walk-in'}</td>
                  <td>{p.kind === 'REFUND' ? <span className="badge badge-info">Refund</span> : 'Payment'}</td>
                  <td>{methodLabel(p.method)}</td>
                  <td>{p.reference || '—'}</td>
                  <td className="num font-semibold">
                    {p.kind === 'REFUND' ? '−' : ''}
                    {money(p.amount)}
                  </td>
                  <td>{p.recordedBy?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={result.pagination.page} pages={result.pagination.pages} total={result.pagination.total} onChange={setPage} />
    </div>
  );
};
