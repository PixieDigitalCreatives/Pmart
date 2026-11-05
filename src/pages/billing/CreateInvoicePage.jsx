import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbTrash as Trash2, TbPlus as Plus, TbFileInvoice as ReceiptText, TbAlertTriangle as AlertTriangle, TbShoppingCart as ShoppingCart } from 'react-icons/tb';
import { billingService } from '@/services/billingService';
import { inventoryService, newIdempotencyKey } from '@/services/inventoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Select, FormField, LoadingState, EmptyState, ConfirmDialog } from '@/components/ui';
import { ScannerInput } from '@/components/inventory/ScannerInput';
import { ProductSearch, MatchChooser } from '@/components/inventory/ProductSearch';
import { ProductThumb } from '@/components/inventory/ProductThumb';
import { computeInvoice } from '@/utils/invoiceCalc';
import { money, qty, PAYMENT_METHODS } from '@/utils/format';

const DRAFT_KEY = 'pmart_invoice_draft';
const TAX_MODES = [
  { value: 'NONE', label: 'Non-GST invoice' },
  { value: 'EXCLUSIVE', label: 'GST added to prices' },
  { value: 'INCLUSIVE', label: 'Prices include GST' }
];

const emptyDraft = (taxMode = 'NONE') => ({
  idempotencyKey: newIdempotencyKey(),
  lines: [],
  taxMode,
  invoiceDiscount: '',
  customerName: '',
  customerPhone: '',
  customerGstin: '',
  notes: '',
  dueDate: '',
  allowNegativeStock: false,
  payments: [{ method: 'CASH', amount: '', reference: '' }],
  payLater: false
});

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveDraft = (draft) => {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage unavailable (private mode); the draft just won't survive a refresh.
  }
};

/** Point-of-sale billing: scan or search products, adjust quantities, take payment, generate the invoice. */
export const CreateInvoicePage = () => {
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const scanner = useRef(null);

  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState('');
  const [choices, setChoices] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    billingService
      .settings()
      .then((s) => {
        setSettings(s);
        setDraft(loadDraft() || emptyDraft(s.taxMode));
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load billing settings.')));
  }, []);

  useEffect(() => {
    if (draft) saveDraft(draft);
  }, [draft]);

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setLine = (key, patch) => setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));

  const addProduct = useCallback((p) => {
    setChoices(null);
    setNotFound('');
    setDraft((d) => {
      const existing = d.lines.find((l) => l.product._id === p._id);
      if (existing) return { ...d, lines: d.lines.map((l) => (l === existing ? { ...l, quantity: String(Math.round(((Number(l.quantity) || 0) + 1) * 1000) / 1000) } : l)) };
      return { ...d, lines: [...d.lines, { key: `${p._id}-${Date.now()}`, product: p, quantity: '1', unitPrice: '', discount: '', taxRate: '' }] };
    });
    setTimeout(() => scanner.current?.focus(), 0);
  }, []);

  const onScan = useCallback(
    async (code) => {
      setLooking(true);
      try {
        const { matches } = await inventoryService.lookup(code);
        if (matches.length === 0) setNotFound(code);
        else if (matches.length === 1) addProduct(matches[0]);
        else setChoices({ code, matches });
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Lookup failed.'));
      } finally {
        setLooking(false);
      }
    },
    [addProduct, toast]
  );

  useEffect(() => {
    const q = (draft?.customerPhone || '').trim();
    if (q.length < 3) return undefined;
    const t = setTimeout(() => billingService.customers(q).then(setCustomers).catch(() => setCustomers([])), 250);
    return () => clearTimeout(t);
  }, [draft?.customerPhone]);

  const override = settings?.canOverridePrice;
  const computed = useMemo(() => {
    if (!draft || !settings) return null;
    const lines = draft.lines.map((l) => ({
      quantity: Number(l.quantity) || 0,
      unitPrice: l.unitPrice !== '' ? Number(l.unitPrice) || 0 : l.product.price,
      discount: Number(l.discount) || 0,
      taxRate: l.taxRate !== '' ? Number(l.taxRate) || 0 : l.product.taxRate ?? settings.defaultTaxRate ?? 0
    }));
    return computeInvoice(lines, { taxMode: draft.taxMode, invoiceDiscount: Number(draft.invoiceDiscount) || 0, roundTotal: settings.roundTotal });
  }, [draft, settings]);

  if (!draft || !settings) return error ? <div className="alert alert-error">{error}</div> : <LoadingState text="Loading billing…" />;

  const total = computed.grandTotal;
  const paying = draft.payLater ? 0 : draft.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = Math.round((total - paying) * 100) / 100;

  const submit = async () => {
    setError('');
    if (draft.lines.length === 0) return setError('Scan or add at least one product.');
    for (const l of draft.lines) {
      const q = Number(l.quantity);
      if (!(q > 0)) return setError(`Enter a quantity above 0 for ${l.product.name}.`);
      const price = l.unitPrice !== '' ? Number(l.unitPrice) : l.product.price;
      if (!(price > 0) && l.unitPrice === '') return setError(`${l.product.name} has no selling price. Set its selling rate or MRP first.`);
    }
    if (paying > total + 0.005) return setError('Payments are more than the invoice total.');

    const payload = {
      idempotencyKey: draft.idempotencyKey,
      taxMode: draft.taxMode,
      items: draft.lines.map((l) => {
        const item = { product: l.product._id, quantity: Number(l.quantity) };
        if (override && l.unitPrice !== '' && Number(l.unitPrice) !== l.product.price) item.unitPrice = Number(l.unitPrice);
        if (override && Number(l.discount) > 0) item.discount = Number(l.discount);
        if (override && l.taxRate !== '') item.taxRate = Number(l.taxRate);
        return item;
      }),
      customerName: draft.customerName.trim(),
      customerPhone: draft.customerPhone.trim(),
      notes: draft.notes.trim(),
      payments: draft.payLater ? [] : draft.payments.filter((p) => Number(p.amount) > 0).map((p) => ({ method: p.method, amount: Number(p.amount), reference: p.reference.trim() }))
    };
    if (draft.customerGstin.trim()) payload.customerGstin = draft.customerGstin.trim();
    if (override && Number(draft.invoiceDiscount) > 0) payload.invoiceDiscount = Number(draft.invoiceDiscount);
    if (draft.dueDate) payload.dueDate = `${draft.dueDate}T23:59:59+05:30`;
    if (draft.allowNegativeStock) payload.allowNegativeStock = true;

    setSaving(true);
    try {
      const { invoice } = await billingService.createInvoice(payload);
      saveDraft(null);
      toast.success(`Invoice ${invoice.number} created`);
      navigate(`/admin/billing/invoices/${invoice._id}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the invoice.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New invoice"
        subtitle="Scan products or search for them. Stock is deducted once, when the invoice is generated."
        action={
          draft.lines.length > 0 && (
            <Button variant="secondary" onClick={() => setConfirmClear(true)}>
              Clear invoice
            </Button>
          )
        }
      />

      <div className="split-layout">
        <div>
          <Card className="mb-4">
            <div className="grid md:grid-cols-2 gap-4">
              <ScannerInput ref={scanner} onScan={onScan} busy={looking} label="Scan barcode" />
              <div>
                <span className="block text-sm font-semibold mb-1">Or search manually</span>
                <ProductSearch onSelect={addProduct} />
              </div>
            </div>
            {notFound && (
              <div className="alert alert-warning mt-3">
                <AlertTriangle size={16} />
                <span>
                  No product has the barcode or code <strong className="mono">{notFound}</strong>.{' '}
                  {can('catalog.manage') ? (
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/products/new?barcode=${encodeURIComponent(notFound)}`)}>
                      Add product
                    </Button>
                  ) : (
                    'Ask an administrator to add it.'
                  )}
                </span>
              </div>
            )}
          </Card>

          {draft.lines.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="No items yet" description="Scan a barcode to add the first item. Scanning the same item again adds one more." />
          ) : (
            <div className="pmart-table-wrapper overflow-x-auto">
              <table className="pmart-table is-dense">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th className="num">Qty</th>
                    <th className="num">MRP</th>
                    <th className="num">Price</th>
                    <th className="num">Discount</th>
                    {draft.taxMode !== 'NONE' && <th className="num">Tax %</th>}
                    <th className="num">Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {draft.lines.map((l, i) => {
                    const c = computed.items[i];
                    const q = Number(l.quantity) || 0;
                    const short = q > l.product.stockCount;
                    return (
                      <tr key={l.key}>
                        <td>{i + 1}</td>
                        <td style={{ minWidth: 220 }}>
                          <div className="flex items-center gap-2">
                            <ProductThumb product={l.product} size={36} />
                            <div>
                              <div className="font-semibold">{l.product.name}</div>
                              <span className="cell-sub mono">
                                {l.product.code} {l.product.barcode && `· ${l.product.barcode}`}
                              </span>
                              <span className={`cell-sub ${short ? 'text-error' : ''}`}>
                                Stock {qty(l.product.stockCount)} {l.product.unit}
                                {short && ' — not enough stock'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="num">
                          <Input className="qty-input" type="number" min="0" step="any" inputMode="decimal" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} aria-label={`Quantity of ${l.product.name}`} />
                        </td>
                        <td className="num">{money(l.product.mrp)}</td>
                        <td className="num">
                          {override ? (
                            <Input className="money-input" type="number" min="0" step="0.01" value={l.unitPrice} placeholder={String(l.product.price)} onChange={(e) => setLine(l.key, { unitPrice: e.target.value })} aria-label={`Price of ${l.product.name}`} />
                          ) : (
                            money(l.product.price)
                          )}
                        </td>
                        <td className="num">
                          {override ? (
                            <Input className="money-input" type="number" min="0" step="0.01" value={l.discount} placeholder="0" onChange={(e) => setLine(l.key, { discount: e.target.value })} aria-label={`Discount on ${l.product.name}`} />
                          ) : (
                            '—'
                          )}
                        </td>
                        {draft.taxMode !== 'NONE' && (
                          <td className="num">
                            {override ? (
                              <Input className="qty-input" type="number" min="0" max="100" step="0.01" value={l.taxRate} placeholder={String(c.taxRate)} onChange={(e) => setLine(l.key, { taxRate: e.target.value })} aria-label={`Tax rate of ${l.product.name}`} />
                            ) : (
                              `${c.taxRate}%`
                            )}
                          </td>
                        )}
                        <td className="num font-semibold">{money(c.lineTotal)}</td>
                        <td>
                          <Button variant="icon" onClick={() => update({ lines: draft.lines.filter((x) => x.key !== l.key) })} aria-label={`Remove ${l.product.name}`}>
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <Card className="mb-4">
            <h3 className="section-heading mb-3">Customer</h3>
            <FormField label="Mobile number" htmlFor="c-phone">
              <Input id="c-phone" list="c-phone-list" inputMode="tel" value={draft.customerPhone} onChange={(e) => {
                const match = customers.find((c) => c.phone === e.target.value);
                update({ customerPhone: e.target.value, ...(match && !draft.customerName ? { customerName: match.name || '' } : {}) });
              }} maxLength={20} />
              <datalist id="c-phone-list">
                {customers.map((c) => (
                  <option key={c._id} value={c.phone}>{`${c.name || ''}${c.outstanding ? ` · owes ${money(c.outstanding)}` : ''}`}</option>
                ))}
              </datalist>
            </FormField>
            <FormField label="Name" htmlFor="c-name">
              <Input id="c-name" value={draft.customerName} onChange={(e) => update({ customerName: e.target.value })} maxLength={120} placeholder="Walk-in customer" />
            </FormField>
            {draft.taxMode !== 'NONE' && (
              <FormField label="Customer GSTIN" htmlFor="c-gstin">
                <Input id="c-gstin" value={draft.customerGstin} onChange={(e) => update({ customerGstin: e.target.value.toUpperCase() })} maxLength={15} />
              </FormField>
            )}
          </Card>

          <Card className="mb-4">
            <h3 className="section-heading mb-3">Totals</h3>
            <FormField label="Invoice type" htmlFor="i-tax">
              <Select id="i-tax" value={draft.taxMode} onChange={(e) => update({ taxMode: e.target.value })}>
                {TAX_MODES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </FormField>
            {override && (
              <FormField label="Invoice discount (₹)" htmlFor="i-disc">
                <Input id="i-disc" type="number" min="0" step="0.01" value={draft.invoiceDiscount} onChange={(e) => update({ invoiceDiscount: e.target.value })} />
              </FormField>
            )}
            <div className="summary-lines">
              <div>
                <span>Subtotal</span>
                <span className="num">{money(computed.subtotal)}</span>
              </div>
              {computed.itemDiscountTotal > 0 && (
                <div>
                  <span>Item discounts</span>
                  <span className="num">−{money(computed.itemDiscountTotal)}</span>
                </div>
              )}
              {computed.invoiceDiscount > 0 && (
                <div>
                  <span>Invoice discount</span>
                  <span className="num">−{money(computed.invoiceDiscount)}</span>
                </div>
              )}
              {draft.taxMode !== 'NONE' && (
                <div>
                  <span>{settings.taxLabel || 'GST'} {draft.taxMode === 'INCLUSIVE' ? '(included)' : ''}</span>
                  <span className="num">{money(computed.taxTotal)}</span>
                </div>
              )}
              {computed.roundOff !== 0 && (
                <div>
                  <span>Round off</span>
                  <span className="num">{money(computed.roundOff)}</span>
                </div>
              )}
              <div className="is-total">
                <span>Total</span>
                <span className="num">{money(total)}</span>
              </div>
            </div>
          </Card>

          <Card className="mb-4">
            <h3 className="section-heading mb-3">Payment</h3>
            <label className="flex items-center gap-2 text-sm mb-3" htmlFor="pay-later">
              <input id="pay-later" type="checkbox" checked={draft.payLater} onChange={(e) => update({ payLater: e.target.checked })} />
              Credit — customer pays later
            </label>
            {!draft.payLater &&
              draft.payments.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <Select value={p.method} onChange={(e) => update({ payments: draft.payments.map((x, j) => (j === i ? { ...x, method: e.target.value } : x)) })} aria-label="Payment method" style={{ width: 130 }}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                  <Input className="money-input" type="number" min="0" step="0.01" placeholder={i === 0 ? String(total) : '0'} value={p.amount} onChange={(e) => update({ payments: draft.payments.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)) })} aria-label="Amount" />
                  {p.method !== 'CASH' && (
                    <Input value={p.reference} placeholder="Ref / UTR" onChange={(e) => update({ payments: draft.payments.map((x, j) => (j === i ? { ...x, reference: e.target.value } : x)) })} aria-label="Payment reference" maxLength={80} />
                  )}
                  {draft.payments.length > 1 && (
                    <Button variant="icon" onClick={() => update({ payments: draft.payments.filter((_, j) => j !== i) })} aria-label="Remove payment">
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
            {!draft.payLater && (
              <div className="actions-row mb-2">
                <Button size="sm" variant="secondary" onClick={() => update({ payments: draft.payments.map((x, j) => (j === 0 ? { ...x, amount: String(total) } : x)) })}>
                  Paid in full
                </Button>
                {draft.payments.length < 5 && (
                  <Button size="sm" variant="secondary" onClick={() => update({ payments: [...draft.payments, { method: 'UPI', amount: '', reference: '' }] })}>
                    <Plus size={14} style={{ marginRight: 4 }} />
                    Split payment
                  </Button>
                )}
              </div>
            )}
            <div className="summary-lines mb-3">
              <div>
                <span>Paying now</span>
                <span className="num">{money(paying)}</span>
              </div>
              <div className={balance > 0 ? 'text-warning font-semibold' : ''}>
                <span>{balance > 0 ? 'Outstanding after this' : 'Balance'}</span>
                <span className="num">{money(Math.max(balance, 0))}</span>
              </div>
            </div>
            {balance > 0 && (
              <FormField label="Due date" htmlFor="i-due" hint={`Default: ${settings.paymentTermsDays || 0} day(s) after the invoice`}>
                <Input id="i-due" type="date" value={draft.dueDate} onChange={(e) => update({ dueDate: e.target.value })} />
              </FormField>
            )}
            <FormField label="Note on invoice" htmlFor="i-note">
              <Input id="i-note" value={draft.notes} onChange={(e) => update({ notes: e.target.value })} maxLength={500} />
            </FormField>
            {settings.canAllowNegativeStock && (
              <label className="flex items-center gap-2 text-sm mb-3" htmlFor="i-neg">
                <input id="i-neg" type="checkbox" checked={draft.allowNegativeStock} onChange={(e) => update({ allowNegativeStock: e.target.checked })} />
                Allow stock to go below zero on this invoice (administrator)
              </label>
            )}
            {error && (
              <div className="alert alert-error mb-3">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}
            <Button variant="primary" size="full" isLoading={saving} disabled={draft.lines.length === 0} onClick={submit}>
              <ReceiptText size={16} style={{ marginRight: 6 }} />
              Generate invoice · {money(total)}
            </Button>
          </Card>
        </div>
      </div>

      <MatchChooser matches={choices?.matches} code={choices?.code} onPick={addProduct} onClose={() => setChoices(null)} />
      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          setDraft(emptyDraft(settings.taxMode));
          setConfirmClear(false);
          scanner.current?.focus();
        }}
        title="Clear this invoice?"
        message="All items and payment details entered so far will be removed. Nothing has been saved or deducted yet."
        confirmText="Clear"
        confirmVariant="primary"
      />
    </div>
  );
};
