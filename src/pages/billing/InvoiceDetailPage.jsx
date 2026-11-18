import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TbChevronLeft as ChevronLeft, TbPrinter as Printer, TbFileDownload as FileDown, TbCurrencyRupee as IndianRupee, TbBan as Ban, TbArrowBackUp as Undo2, TbReceipt as Receipt, TbAlertTriangle as AlertTriangle, TbTrash as Trash2, TbBrandWhatsapp as BrandWhatsapp } from 'react-icons/tb';
import { billingService } from '@/services/billingService';
import { newIdempotencyKey } from '@/services/inventoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Button, Input, Select, FormField, Modal, LoadingState, StatusBadge } from '@/components/ui';
import { DeleteInvoiceModal } from '@/components/billing/DeleteInvoiceModal';
import { money, qty, dateTime, date, PAYMENT_METHODS, PAYMENT_STATUS, methodLabel, MOVEMENT_LABEL } from '@/utils/format';
import { amountToWords } from '@/utils/numberToWords';
import { SupermarketReceipt } from '@/components/billing/SupermarketReceipt';
import '@/components/inventory/inventory.scss';
import './billing.scss';
import './SupermarketReceipt.scss';

const Status = ({ status }) => <StatusBadge text={PAYMENT_STATUS[status]?.label || status} type={PAYMENT_STATUS[status]?.type || 'neutral'} />;

/** One payment / refund form, used for "Record payment" and "Refund". */
const MoneyModal = ({ isOpen, title, max, onClose, onSubmit, submitText }) => {
  const [form, setForm] = useState({ amount: '', method: 'CASH', reference: '', note: '' });
  const [key, setKey] = useState(newIdempotencyKey());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (isOpen) {
      setForm({ amount: String(max), method: 'CASH', reference: '', note: '' });
      setKey(newIdempotencyKey());
      setError('');
    }
  }, [isOpen, max]);
  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) return setError('Enter an amount above 0.');
    if (amount > max + 0.005) return setError(`At most ${money(max)}.`);
    setSaving(true);
    setError('');
    try {
      await onSubmit({ ...form, amount, idempotencyKey: key });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <FormField label="Amount (₹)" htmlFor="m-amount" hint={`Up to ${money(max)}`}>
            <Input id="m-amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
          </FormField>
          <FormField label="Method" htmlFor="m-method">
            <Select id="m-method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Reference (UPI / card / cheque no.)" htmlFor="m-ref">
          <Input id="m-ref" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} maxLength={80} />
        </FormField>
        <FormField label="Note" htmlFor="m-note">
          <Input id="m-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={300} />
        </FormField>
        {error && <div className="alert alert-error mb-3">{error}</div>}
        <Button type="submit" variant="primary" isLoading={saving}>
          {submitText}
        </Button>
      </form>
    </Modal>
  );
};

export const InvoiceDetailPage = () => {
  const { id } = useParams();
  const { can, role } = useAuth();
  const { t, lang } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [movements, setMovements] = useState([]);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [cancelForm, setCancelForm] = useState({ reason: '', refundMethod: 'CASH' });
  const [returnForm, setReturnForm] = useState({ reason: '', refundMethod: 'CASH', quantities: {} });
  const [actionKey, setActionKey] = useState(newIdempotencyKey());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      const [inv, mv, s] = await Promise.all([billingService.getInvoice(id), billingService.invoiceMovements(id).catch(() => []), billingService.settings().catch(() => null)]);
      setInvoice(inv);
      setMovements(mv);
      setSettings(s);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the invoice.'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!invoice) return <LoadingState text="Loading invoice…" />;

  const cancelled = invoice.status === 'CANCELLED';
  const open = (name) => {
    setActionKey(newIdempotencyKey());
    setActionError('');
    setModal(name);
  };
  const runAction = async (fn, message) => {
    setBusy(true);
    setActionError('');
    try {
      await fn();
      toast.success(message);
      setModal(null);
      await load();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const print = () => {
    window.print();
  };
  const shareWhatsApp = () => {
    const text = `*PMart Bill - ${invoice.number}*\nCustomer: ${invoice.customerName || 'Walk-in'}\nTotal: ₹${invoice.netTotal}\nPaid: ₹${invoice.amountPaid}\nRemaining: ₹${invoice.outstanding}\nDate: ${new Date(invoice.date).toLocaleDateString('en-IN')}\nThank you for shopping with PMart!`;
    const phone = invoice.customerPhone ? invoice.customerPhone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const billing = settings || {};
  const seller = billing.businessName || invoice.shop?.name || 'PMart';
  const taxed = invoice.taxMode !== 'NONE';
  const returnable = invoice.items.filter((l) => l.quantity - (l.returnedQuantity || 0) > 0);

  return (
    <div>
      <div className="no-print">
        <Link to="/admin/billing/invoices" className="flex items-center gap-1 text-sm mb-3">
          <ChevronLeft size={16} />
          <span>{lang === 'hi' ? 'सभी बिल' : 'All invoices'}</span>
        </Link>
        <PageHeader
          title={`${lang === 'hi' ? 'बिल' : 'Invoice'} ${invoice.number}`}
          subtitle={`${dateTime(invoice.date)} · ${lang === 'hi' ? 'निर्माता' : 'created by'} ${invoice.createdBy?.name || '—'}`}
          action={<Status status={cancelled ? 'CANCELLED' : invoice.displayStatus} />}
        />
        <div className="actions-row mb-4">
          {!cancelled && invoice.outstanding > 0 && can('payments.record') && (
            <Button variant="primary" onClick={() => open('pay')}>
              <IndianRupee size={16} style={{ marginRight: 6 }} />
              {lang === 'hi' ? 'पैसे जमा करें' : 'Record payment'}
            </Button>
          )}
          <Button variant="primary" onClick={print}>
            <Receipt size={16} style={{ marginRight: 6 }} />
            {lang === 'hi' ? 'थर्मल रसीद प्रिंट' : 'Print Thermal Receipt'}
          </Button>
          <Button variant="secondary" onClick={shareWhatsApp} style={{ color: '#16a34a', borderColor: '#86efac' }}>
            <BrandWhatsapp size={16} style={{ marginRight: 6 }} />
            WhatsApp
          </Button>
          <Button variant="secondary" onClick={() => billingService.downloadPdf(invoice._id, invoice.number).catch((err) => toast.error(apiErrorMessage(err)))}>
            <FileDown size={16} style={{ marginRight: 6 }} />
            PDF
          </Button>
          {!cancelled && can('invoices.cancel') && returnable.length > 0 && (
            <Button variant="secondary" onClick={() => { setReturnForm({ reason: '', refundMethod: 'CASH', quantities: {} }); open('return'); }}>
              <Undo2 size={16} style={{ marginRight: 6 }} />
              {lang === 'hi' ? 'सामान वापसी (Return)' : 'Return items'}
            </Button>
          )}
          {invoice.refundDue > 0 && can('invoices.cancel') && (
            <Button variant="secondary" onClick={() => open('refund')}>
              {lang === 'hi' ? `रिफंड ${money(invoice.refundDue)}` : `Refund ${money(invoice.refundDue)}`}
            </Button>
          )}
          {!cancelled && can('invoices.cancel') && (
            <Button variant="secondary" onClick={() => { setCancelForm({ reason: '', refundMethod: 'CASH' }); open('cancel'); }}>
              <Ban size={16} style={{ marginRight: 6 }} />
              {lang === 'hi' ? 'बिल रद्द करें' : 'Cancel invoice'}
            </Button>
          )}
          {role === 'ADMIN' && (
            <Button variant="secondary" className="invoice-delete-btn" onClick={() => setModal('delete')}>
              <Trash2 size={16} style={{ marginRight: 6 }} />
              {lang === 'hi' ? 'बिल हटाएं' : 'Delete invoice'}
            </Button>
          )}
        </div>
        <div className="kpi-grid mb-4">
          {[
            ['Total', money(invoice.grandTotal)],
            ...(invoice.returnedTotal ? [['Returned', money(invoice.returnedTotal)], ['Net', money(invoice.netTotal)]] : []),
            ['Paid', money(invoice.amountPaid)],
            [invoice.refundDue > 0 ? 'Refund due' : 'Outstanding', money(invoice.refundDue > 0 ? invoice.refundDue : invoice.outstanding)],
            ['Due date', date(invoice.dueDate)]
          ].map(([label, value]) => (
            <div className="kpi-tile" key={label}>
              <div className="kpi-tile-label">{label}</div>
              <div className="kpi-tile-value">{value}</div>
            </div>
          ))}
        </div>
        {cancelled && (
          <div className="alert alert-error mb-4">
            <Ban size={16} />
            <span>
              Cancelled {dateTime(invoice.cancelledAt)} by {invoice.cancelledBy?.name || '—'}: {invoice.cancelReason}. Stock was put back.
            </span>
          </div>
        )}

      </div>

      {/* Printable document - Thermal Supermarket Receipt Only */}
      <div className="invoice-paper invoice-paper--receipt">
        <SupermarketReceipt invoice={invoice} settings={billing} lang={lang} />
      </div>

      <div className="no-print mt-4">
        <h3 className="section-heading mb-2">Stock movements</h3>
        <div className="pmart-table-wrapper overflow-x-auto">
          <table className="pmart-table is-dense">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Product</th>
                <th className="num">Change</th>
                <th className="num">Before</th>
                <th className="num">After</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m._id}>
                  <td>{dateTime(m.createdAt)}</td>
                  <td>{MOVEMENT_LABEL[m.type] || m.type}</td>
                  <td>{m.productName}</td>
                  <td className="num">{m.quantity > 0 ? `+${qty(m.quantity)}` : qty(m.quantity)}</td>
                  <td className="num">{qty(m.stockBefore)}</td>
                  <td className="num">{qty(m.stockAfter)}</td>
                  <td>{m.user?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {invoice.returns.length > 0 && (
          <>
            <h3 className="section-heading mb-2 mt-4">Returns</h3>
            {invoice.returns.map((r) => (
              <div key={r._id} className="muted-note">
                {r.number} · {dateTime(r.date)} · {money(r.amount)} · {r.reason}
              </div>
            ))}
          </>
        )}
      </div>

      <MoneyModal
        isOpen={modal === 'pay'}
        title="Record payment"
        max={invoice.outstanding}
        submitText="Save payment"
        onClose={() => setModal(null)}
        onSubmit={async (body) => {
          await billingService.recordPayment(invoice._id, body);
          toast.success('Payment recorded');
          setModal(null);
          await load();
        }}
      />
      <MoneyModal
        isOpen={modal === 'refund'}
        title="Refund to customer"
        max={invoice.refundDue}
        submitText="Save refund"
        onClose={() => setModal(null)}
        onSubmit={async (body) => {
          await billingService.recordRefund(invoice._id, body);
          toast.success('Refund recorded');
          setModal(null);
          await load();
        }}
      />

      <Modal isOpen={modal === 'cancel'} onClose={() => setModal(null)} title={`Cancel ${invoice.number}?`}>
        <p className="dialog-text">All items not already returned go back into stock. This cannot be undone.</p>
        <FormField label="Reason *" htmlFor="x-reason">
          <Input id="x-reason" value={cancelForm.reason} onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })} maxLength={300} autoFocus />
        </FormField>
        {invoice.amountPaid > 0 && (
          <FormField label={`Refund ${money(invoice.amountPaid)} by`} htmlFor="x-method">
            <Select id="x-method" value={cancelForm.refundMethod} onChange={(e) => setCancelForm({ ...cancelForm, refundMethod: e.target.value })}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        {actionError && <div className="alert alert-error mb-3">{actionError}</div>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>
            Keep invoice
          </Button>
          <Button
            variant="primary"
            isLoading={busy}
            disabled={cancelForm.reason.trim().length < 3}
            onClick={() => runAction(() => billingService.cancelInvoice(invoice._id, { reason: cancelForm.reason.trim(), refundMethod: invoice.amountPaid > 0 ? cancelForm.refundMethod : undefined, idempotencyKey: actionKey }), 'Invoice cancelled and stock restored')}
          >
            Cancel invoice
          </Button>
        </div>
      </Modal>

      <DeleteInvoiceModal invoice={modal === 'delete' ? invoice : null} onClose={() => setModal(null)} onDeleted={() => navigate('/admin/billing/invoices', { replace: true })} />

      <Modal isOpen={modal === 'return'} onClose={() => setModal(null)} title="Return items">
        <table className="pmart-table is-dense mb-3">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Can return</th>
              <th className="num">Return</th>
            </tr>
          </thead>
          <tbody>
            {returnable.map((l) => {
              const left = Math.round((l.quantity - (l.returnedQuantity || 0)) * 1000) / 1000;
              return (
                <tr key={l.lineNo}>
                  <td>{l.name}</td>
                  <td className="num">{qty(left)}</td>
                  <td className="num">
                    <Input className="qty-input" type="number" min="0" max={left} step="any" value={returnForm.quantities[l.lineNo] || ''} onChange={(e) => setReturnForm({ ...returnForm, quantities: { ...returnForm.quantities, [l.lineNo]: e.target.value } })} aria-label={`Return quantity for ${l.name}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <FormField label="Reason *" htmlFor="ret-reason">
          <Input id="ret-reason" value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })} maxLength={300} />
        </FormField>
        {invoice.amountPaid > 0 && (
          <FormField label="Refund what is due by" htmlFor="ret-method" hint="Leave as 'Not now' to refund later">
            <Select id="ret-method" value={returnForm.refundMethod} onChange={(e) => setReturnForm({ ...returnForm, refundMethod: e.target.value })}>
              <option value="">Not now</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        {actionError && (
          <div className="alert alert-error mb-3">
            <AlertTriangle size={16} />
            <span>{actionError}</span>
          </div>
        )}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>
            Close
          </Button>
          <Button
            variant="primary"
            isLoading={busy}
            disabled={returnForm.reason.trim().length < 3 || !Object.values(returnForm.quantities).some((v) => Number(v) > 0)}
            onClick={() =>
              runAction(
                () =>
                  billingService.returnItems(invoice._id, {
                    items: Object.entries(returnForm.quantities)
                      .filter(([, v]) => Number(v) > 0)
                      .map(([lineNo, v]) => ({ lineNo: Number(lineNo), quantity: Number(v) })),
                    reason: returnForm.reason.trim(),
                    refundMethod: invoice.amountPaid > 0 && returnForm.refundMethod ? returnForm.refundMethod : undefined,
                    idempotencyKey: actionKey
                  }),
                'Return recorded and stock restored'
              )
            }
          >
            Save return
          </Button>
        </div>
      </Modal>
    </div>
  );
};
