import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { billingService } from '@/services/billingService';
import { newIdempotencyKey } from '@/services/inventoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Button, Input, FormField, LoadingState, EmptyState } from '@/components/ui';
import { money, dateTime, PAYMENT_METHODS } from '@/utils/format';
import { TbReceipt as Receipt, TbCash as Cash, TbSearch as Search, TbX as X, TbPrinter as Printer, TbPhone as Phone } from 'react-icons/tb';
import '@/components/inventory/inventory.scss';
import './billing.scss';

export const OutstandingsPage = () => {
  const { t, lang } = useLanguage();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ rows: [], summary: { totalOutstanding: 0, totalInvoices: 0 }, pagination: { page: 1, pages: 1, total: 0 } });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Collect Payment Modal
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    note: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await billingService.listOutstandings({ page, limit: 25, search: search.trim() });
      setData(res);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load outstandings list'));
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    const timer = setTimeout(loadData, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const openPaymentModal = (invoice) => {
    setActiveInvoice(invoice);
    setPaymentForm({
      amount: String(invoice.outstanding),
      method: 'CASH',
      reference: '',
      note: ''
    });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!activeInvoice) return;
    const amount = Number(paymentForm.amount);
    if (!(amount > 0)) {
      toast.error(lang === 'hi' ? 'कृपया सही राशि दर्ज करें' : 'Please enter a valid amount');
      return;
    }
    if (amount > activeInvoice.outstanding + 0.005) {
      toast.error(lang === 'hi' ? 'भुगतान बाकी रकम से अधिक नहीं हो सकता' : 'Amount cannot exceed outstanding balance');
      return;
    }

    setSavingPayment(true);
    try {
      const recorded = await billingService.recordPayment(activeInvoice._id, {
        amount,
        method: paymentForm.method,
        reference: paymentForm.reference.trim(),
        note: paymentForm.note.trim(),
        idempotencyKey: newIdempotencyKey()
      });
      toast.success(t('outstandings.payment_recorded', 'Payment recorded successfully!'));
      setLastReceipt({
        ...recorded,
        invoiceNumber: activeInvoice.number,
        customerName: activeInvoice.customerName || activeInvoice.customer?.name,
        customerPhone: activeInvoice.customerPhone || activeInvoice.customer?.phone,
        newOutstanding: Math.max(0, Math.round((activeInvoice.outstanding - amount) * 100) / 100)
      });
      setActiveInvoice(null);
      loadData();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to record payment'));
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <div className="pmart-erp-page">
      <PageHeader
        title={t('outstandings.title', 'Customer Outstandings & Dues')}
        subtitle={t('help.outstandings', 'Track all pending customer bills and record payments directly')}
      />

      <div className="kpi-grid mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="kpi-tile">
          <div className="kpi-tile-label">{t('outstandings.total_pending', 'Total Outstanding')}</div>
          <div className="kpi-tile-value text-red-600">{money(data.summary?.totalOutstanding || 0)}</div>
          <div className="kpi-tile-hint">{lang === 'hi' ? 'सभी ग्राहकों से कुल बाकी रकम' : 'Across all pending invoices'}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-label">{t('outstandings.pending_invoices', 'Pending Bills')}</div>
          <div className="kpi-tile-value">{data.summary?.totalInvoices || 0}</div>
          <div className="kpi-tile-hint">{lang === 'hi' ? 'अपूर्ण भुगतान वाले बिल' : 'Partially or unpaid bills'}</div>
        </div>
      </div>

      <Card className="mb-4">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'hi' ? 'ग्राहक का नाम, मोबाइल नंबर या बिल नंबर खोजें...' : 'Search customer name, phone or invoice number...'}
              style={{ paddingLeft: 34 }}
            />
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>
          {search && (
            <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
              {t('nav.cancel', 'Clear')}
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <LoadingState text={t('ui.loading', 'Loading...')} />
      ) : data.rows.length === 0 ? (
        <EmptyState
          title={lang === 'hi' ? 'कोई बकाया बिल नहीं है!' : 'No pending outstandings!'}
          description={lang === 'hi' ? 'बहुत बढ़िया! सभी बिलों का पूरा भुगतान प्राप्त हो चुका है।' : 'Great job! All customer accounts are clear.'}
        />
      ) : (
        <div className="card-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>{t('nav.invoice_history', 'Invoice')}</th>
                <th>{t('customers.name', 'Customer')}</th>
                <th>{t('ui.date', 'Date')}</th>
                <th className="num">{t('nav.total_amount', 'Bill Total')}</th>
                <th className="num">{lang === 'hi' ? 'जमा रकम' : 'Paid'}</th>
                <th className="num">{t('nav.outstanding', 'Remaining')}</th>
                <th className="num">{t('ui.action', 'Action')}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((inv) => (
                <tr key={inv._id}>
                  <td>
                    <Link to={`/admin/billing/invoices/${inv._id}`} className="mono font-bold" style={{ color: '#dc2626' }}>
                      {inv.number}
                    </Link>
                    {inv.isOverdue && (
                      <span className="badge badge-error ml-2" style={{ fontSize: 10, padding: '2px 6px' }}>
                        {lang === 'hi' ? 'अवधि समाप्त' : 'Overdue'}
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>{inv.customerName || inv.customer?.name || (lang === 'hi' ? 'आम ग्राहक' : 'Walk-in')}</strong>
                    {(inv.customerPhone || inv.customer?.phone) && (
                      <div className="cell-sub"><Phone size={12} style={{ display: 'inline', marginRight: 2 }} />{inv.customerPhone || inv.customer?.phone}</div>
                    )}
                  </td>
                  <td>{dateTime(inv.date)}</td>
                  <td className="num">{money(inv.netTotal)}</td>
                  <td className="num text-emerald-600">{money(inv.amountPaid)}</td>
                  <td className="num font-bold text-red-600" style={{ fontSize: 15 }}>
                    {money(inv.outstanding)}
                  </td>
                  <td className="num">
                    <Button variant="primary" size="sm" onClick={() => openPaymentModal(inv)}>
                      <Cash size={15} style={{ marginRight: 4 }} />
                      {t('outstandings.record_payment', 'Collect Payment')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Collect Payment Modal */}
      {activeInvoice && (
        <div className="modal-overlay" onClick={() => setActiveInvoice(null)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitPayment}>
              <div className="modal-head">
                <div>
                  <h3>{t('outstandings.record_payment', 'Collect Payment')}</h3>
                  <p className="cell-sub">{activeInvoice.number} – {activeInvoice.customerName || 'Walk-in'}</p>
                </div>
                <Button type="button" variant="ghost" onClick={() => setActiveInvoice(null)}><X size={18} /></Button>
              </div>

              <div className="modal-body">
                <div className="p-3 mb-3" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{t('nav.total_amount', 'Total Bill')}:</span>
                    <strong>{money(activeInvoice.netTotal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{lang === 'hi' ? 'पहले मिला' : 'Already Paid'}:</span>
                    <strong className="text-emerald-600">{money(activeInvoice.amountPaid)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                    <span className="font-bold text-red-700">{t('nav.outstanding', 'Remaining Balance')}:</span>
                    <strong className="font-bold text-red-700">{money(activeInvoice.outstanding)}</strong>
                  </div>
                </div>

                <FormField label={lang === 'hi' ? 'कितने पैसे मिले? (₹)' : 'Amount Received (₹)'} required>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={activeInvoice.outstanding}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    autoFocus
                    style={{ fontSize: 18, fontWeight: 'bold' }}
                  />
                </FormField>

                <FormField label={t('billing.payment_options', 'Payment Method')} required>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {['CASH', 'UPI', 'CARD'].map((m) => (
                      <button
                        type="button"
                        key={m}
                        className={`btn ${paymentForm.method === m ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '8px 12px', fontSize: 14 }}
                        onClick={() => setPaymentForm({ ...paymentForm, method: m })}
                      >
                        {m === 'CASH' ? t('billing.cash', 'Cash') : m === 'UPI' ? 'UPI' : t('billing.card', 'Card')}
                      </button>
                    ))}
                  </div>
                </FormField>

                <FormField label={lang === 'hi' ? 'संदर्भ / यूटीआर नंबर (वैकल्पिक)' : 'Reference / UTR (Optional)'}>
                  <Input
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    placeholder={lang === 'hi' ? 'UPI रेफरेंस या रसीद नंबर' : 'UPI ref or cheque number'}
                  />
                </FormField>
              </div>

              <div className="modal-foot">
                <Button type="button" variant="secondary" onClick={() => setActiveInvoice(null)}>
                  {t('nav.cancel', 'Cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={savingPayment}>
                  {savingPayment ? t('ui.loading', 'Saving...') : (lang === 'hi' ? 'रुपये जमा करें' : 'Record Payment')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {lastReceipt && (
        <div className="modal-overlay" onClick={() => setLastReceipt(null)}>
          <div className="modal-content" style={{ maxWidth: 420, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{lang === 'hi' ? 'भुगतान रसीद' : 'Payment Receipt'}</h3>
              <Button variant="ghost" onClick={() => setLastReceipt(null)}><X size={18} /></Button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <h2 style={{ color: '#16a34a', margin: '4px 0' }}>{money(lastReceipt.amount)}</h2>
              <p style={{ color: '#475569', fontSize: 14 }}>{lang === 'hi' ? 'सफलतापूर्वक प्राप्त हुआ' : 'Received successfully'}</p>

              <div className="p-3 my-3" style={{ background: '#f8fafc', borderRadius: 8, textAlign: 'left', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>{t('nav.invoice_history', 'Invoice')}:</span>
                  <strong>{lastReceipt.invoiceNumber}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>{t('customers.name', 'Customer')}:</span>
                  <strong>{lastReceipt.customerName || 'Walk-in'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>{t('billing.payment_options', 'Method')}:</span>
                  <strong>{lastReceipt.method}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                  <span>{t('nav.outstanding', 'Remaining')}:</span>
                  <strong className="text-red-600">{money(lastReceipt.newOutstanding)}</strong>
                </div>
              </div>
            </div>
            <div className="modal-foot" style={{ justifyContent: 'center' }}>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={16} style={{ marginRight: 6 }} />
                {lang === 'hi' ? 'रसीद प्रिंट करें' : 'Print Receipt'}
              </Button>
              <Button variant="primary" onClick={() => setLastReceipt(null)}>
                {lang === 'hi' ? 'ठीक है' : 'OK'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

