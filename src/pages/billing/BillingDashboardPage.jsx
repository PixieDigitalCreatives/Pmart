import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TbPlus as Plus, TbPackageImport as PackagePlus } from 'react-icons/tb';
import { billingService } from '@/services/billingService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Button, Card, LoadingState, StatusBadge } from '@/components/ui';
import { money, qty, dateTime, methodLabel, PAYMENT_STATUS } from '@/utils/format';
import '@/components/inventory/inventory.scss';

const Tile = ({ label, value, hint, to }) => {
  const body = (
    <>
      <div className="kpi-tile-label">{label}</div>
      <div className="kpi-tile-value">{value}</div>
      {hint && <div className="kpi-tile-hint">{hint}</div>}
    </>
  );
  return to ? (
    <Link to={to} className="kpi-tile" style={{ display: 'block' }}>
      {body}
    </Link>
  ) : (
    <div className="kpi-tile">{body}</div>
  );
};

/** In-store sales, collections and outstanding balances at a glance. */
export const BillingDashboardPage = () => {
  const { can } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    billingService
      .dashboard()
      .then(setD)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the billing overview.')));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!d) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Billing overview"
        subtitle="Generating an invoice never marks it paid; collections come from recorded payments."
        action={
          <div className="actions-row">
            {can('inventory.restock') && (
              <Button variant="secondary" component={Link} to="/admin/inventory/restock">
                <PackagePlus size={16} style={{ marginRight: 6 }} />
                Restock
              </Button>
            )}
            {can('invoices.create') && (
              <Button variant="primary" component={Link} to="/admin/billing/new">
                <Plus size={16} style={{ marginRight: 6 }} />
                New invoice
              </Button>
            )}
          </div>
        }
      />

      <div className="kpi-grid mb-4">
        <Tile label="Today's sales" value={money(d.todaySales)} hint={`${d.todayInvoices} invoice(s) today`} />
        <Tile label="Total sales" value={money(d.totalSales)} hint="Net of returns, excl. cancelled" />
        <Tile label="Collected" value={money(d.collected)} hint={d.refunded ? `after ${money(d.refunded)} refunds` : 'Payments received'} to="/admin/billing/payments" />
        <Tile label="Outstanding" value={money(d.outstanding)} hint="Still to be collected" to="/admin/billing/invoices?sort=outstanding" />
        <Tile label="Total orders" value={d.totalOrders.toLocaleString('en-IN')} hint={`${d.totalInvoices} invoices + ${d.onlineOrders} online orders`} />
        <Tile label="Total invoices" value={d.totalInvoices.toLocaleString('en-IN')} hint={`${d.paidCount} paid · ${d.cancelledCount} cancelled`} to="/admin/billing/invoices" />
        <Tile label="Unpaid" value={d.unpaid.count} hint={money(d.unpaid.outstanding)} to="/admin/billing/invoices?paymentStatus=UNPAID" />
        <Tile label="Partially paid" value={d.partiallyPaid.count} hint={money(d.partiallyPaid.outstanding)} to="/admin/billing/invoices?paymentStatus=PARTIALLY_PAID" />
        <Tile label="Overdue" value={d.overdue.count} hint={money(d.overdue.outstanding)} to="/admin/billing/invoices?paymentStatus=OVERDUE" />
        <Tile label="Low stock" value={d.lowStockCount.toLocaleString('en-IN')} hint={`1 to ${d.lowStockThreshold} left`} to="/admin/products?stock=low" />
        <Tile label="Out of stock" value={d.outOfStockCount.toLocaleString('en-IN')} hint="Zero or below" to="/admin/products?stock=out" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="section-heading mb-2">Recent invoices</h3>
          {d.recentInvoices.length === 0 ? (
            <p className="muted-note">No invoices yet.</p>
          ) : (
            <table className="pmart-table is-dense">
              <tbody>
                {d.recentInvoices.map((i) => (
                  <tr key={i._id}>
                    <td className="mono">
                      <Link to={`/admin/billing/invoices/${i._id}`}>{i.number}</Link>
                      <span className="cell-sub">{dateTime(i.date)}</span>
                    </td>
                    <td>{i.customerName || 'Walk-in'}</td>
                    <td className="num">{money(i.netTotal)}</td>
                    <td>
                      <StatusBadge text={PAYMENT_STATUS[i.displayStatus]?.label} type={PAYMENT_STATUS[i.displayStatus]?.type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card>
          <h3 className="section-heading mb-2">Recent transactions</h3>
          {d.recentPayments.length === 0 ? (
            <p className="muted-note">No payments recorded yet.</p>
          ) : (
            <table className="pmart-table is-dense">
              <tbody>
                {d.recentPayments.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {dateTime(p.receivedAt)}
                      <span className="cell-sub mono">
                        <Link to={`/admin/billing/invoices/${p.invoice}`}>{p.invoiceNumber}</Link>
                      </span>
                    </td>
                    <td>{p.customerName || 'Walk-in'}</td>
                    <td>{p.kind === 'REFUND' ? 'Refund' : methodLabel(p.method)}</td>
                    <td className="num font-semibold">
                      {p.kind === 'REFUND' ? '−' : ''}
                      {money(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card>
          <h3 className="section-heading mb-2">Most sold (last 30 days)</h3>
          {d.topProducts.length === 0 ? (
            <p className="muted-note">No sales in the last 30 days.</p>
          ) : (
            <table className="pmart-table is-dense">
              <tbody>
                {d.topProducts.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <Link to={`/admin/products/${p._id}`}>{p.name}</Link>
                      <span className="cell-sub mono">{p.code}</span>
                    </td>
                    <td className="num">{qty(p.quantity)} sold</td>
                    <td className="num">{money(p.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card>
          <h3 className="section-heading mb-2">Low stock</h3>
          {d.lowStock.length === 0 ? (
            <p className="muted-note">No product has between 1 and {d.lowStockThreshold} left.</p>
          ) : (
            <table className="pmart-table is-dense">
              <tbody>
                {d.lowStock.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <Link to={`/admin/products/${p._id}`}>{p.name}</Link>
                      <span className="cell-sub mono">{p.code}</span>
                    </td>
                    <td>{p.rackNo ? `Rack ${p.rackNo}` : ''}</td>
                    <td className="num">
                      <span className={`badge ${p.stockCount <= 0 ? 'badge-error' : 'badge-warning'}`}>
                        {qty(p.stockCount)} {p.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-2">
            <Link to="/admin/products?stock=low" className="text-sm">
              See all low-stock products
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
