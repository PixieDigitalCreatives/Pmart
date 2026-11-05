import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TbFileInvoice as ReceiptText, TbPlus as Plus, TbX as X, TbTrash as Trash2 } from 'react-icons/tb';
import { billingService } from '@/services/billingService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Button, Input, Select, StatusBadge, LoadingState, EmptyState } from '@/components/ui';
import { ScannerInput } from '@/components/inventory/ScannerInput';
import { Pagination, SortTh } from '@/components/inventory/Pagination';
import { DeleteInvoiceModal } from '@/components/billing/DeleteInvoiceModal';
import { money, dateTime, date, PAYMENT_METHODS, PAYMENT_STATUS } from '@/utils/format';
import '@/components/inventory/inventory.scss';
import './billing.scss';

const STATUSES = ['PAID', 'PARTIALLY_PAID', 'UNPAID', 'OVERDUE', 'REFUNDED', 'CANCELLED'];

/** Invoice history with search, filters and outstanding balances. Scanning a barcode lists invoices with that product. */
export const InvoicesPage = () => {
  const { can, role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [result, setResult] = useState({ rows: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);

  const filters = Object.fromEntries(['search', 'from', 'to', 'paymentStatus', 'method', 'product', 'sort', 'page'].map((k) => [k, params.get(k) || '']));
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      setResult(await billingService.listInvoices({ ...query, limit: 25 }));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load invoices.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== filters.search) setFilter('search', search.trim());
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onDeleted = () => {
    setToDelete(null);
    // The last row of a later page: step back a page instead of showing an empty one.
    if (result.rows.length === 1 && result.pagination.page > 1) setFilter('page', String(result.pagination.page - 1));
    else load();
  };

  const onScan = (code) => {
    // An invoice number opens that invoice; anything else filters by product barcode / code.
    const match = result.rows.find((r) => r.number.toUpperCase() === code.toUpperCase());
    if (match) navigate(`/admin/billing/invoices/${match._id}`);
    else if (/^[A-Z0-9-]+-\d{4,}$/i.test(code)) setFilter('search', code);
    else setFilter('product', code);
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Search, filter and collect outstanding payments."
        action={
          can('invoices.create') && (
            <Button variant="primary" component={Link} to="/admin/billing/new">
              <Plus size={16} style={{ marginRight: 6 }} />
              New invoice
            </Button>
          )
        }
      />

      <div className="toolbar">
        <div className="toolbar-grow">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice no., customer name or phone" aria-label="Search invoices" />
        </div>
        <Select value={filters.paymentStatus} onChange={(e) => setFilter('paymentStatus', e.target.value)} aria-label="Payment status" style={{ width: 170 }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS[s].label}
            </option>
          ))}
        </Select>
        <Select value={filters.method} onChange={(e) => setFilter('method', e.target.value)} aria-label="Payment method" style={{ width: 150 }}>
          <option value="">Any method</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <Input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} aria-label="From date" style={{ width: 150 }} />
        <Input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} aria-label="To date" style={{ width: 150 }} />
      </div>
      <div className="toolbar">
        <div className="toolbar-grow">
          <ScannerInput onScan={onScan} autoFocus={false} placeholder="Scan an invoice number or a product barcode" />
        </div>
        {filters.product && (
          <Button size="sm" variant="secondary" onClick={() => setFilter('product', '')}>
            Product {filters.product} <X size={14} style={{ marginLeft: 4 }} />
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : result.rows.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No invoices" description="Invoices you generate appear here." />
      ) : (
        <div className="pmart-table-wrapper overflow-x-auto">
          <table className="pmart-table is-dense">
            <thead>
              <tr>
                <SortTh field="number" sort={filters.sort || 'date'} onSort={(s) => setFilter('sort', s.replace('-', ''))}>
                  Invoice
                </SortTh>
                <SortTh field="date" sort={filters.sort || 'date'} onSort={(s) => setFilter('sort', s.replace('-', ''))}>
                  Date
                </SortTh>
                <th>Customer</th>
                <SortTh field="total" sort={filters.sort || 'date'} onSort={(s) => setFilter('sort', s.replace('-', ''))} align="right">
                  Total
                </SortTh>
                <th className="num">Paid</th>
                <SortTh field="outstanding" sort={filters.sort || 'date'} onSort={(s) => setFilter('sort', s.replace('-', ''))} align="right">
                  Outstanding
                </SortTh>
                <th>Due</th>
                <th>Status</th>
                <th>By</th>
                {isAdmin && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r._id} className="cursor-pointer" onClick={() => navigate(`/admin/billing/invoices/${r._id}`)}>
                  <td className="mono font-semibold">
                    <Link to={`/admin/billing/invoices/${r._id}`} onClick={(e) => e.stopPropagation()}>
                      {r.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{dateTime(r.date)}</td>
                  <td>
                    {r.customerName || 'Walk-in'}
                    {r.customerPhone && <span className="cell-sub">{r.customerPhone}</span>}
                  </td>
                  <td className="num">{money(r.netTotal)}</td>
                  <td className="num">{money(r.amountPaid)}</td>
                  <td className="num font-semibold">{r.outstanding > 0 ? money(r.outstanding) : '—'}</td>
                  <td className="whitespace-nowrap">{r.outstanding > 0 ? date(r.dueDate) : '—'}</td>
                  <td>
                    <StatusBadge text={PAYMENT_STATUS[r.displayStatus]?.label || r.displayStatus} type={PAYMENT_STATUS[r.displayStatus]?.type} />
                  </td>
                  <td>{r.createdBy?.name || '—'}</td>
                  {isAdmin && (
                    <td className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="invoice-delete-btn"
                        title="Delete invoice"
                        aria-label={`Delete ${r.number}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setToDelete(r);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={result.pagination.page} pages={result.pagination.pages} total={result.pagination.total} onChange={(p) => setFilter('page', String(p))} />
      <DeleteInvoiceModal invoice={toDelete} onClose={() => setToDelete(null)} onDeleted={onDeleted} />
    </div>
  );
};
