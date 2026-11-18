import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TbTrash as Trash2,
  TbPlus as Plus,
  TbFileInvoice as ReceiptText,
  TbAlertTriangle as AlertTriangle,
  TbShoppingCart as ShoppingCart,
  TbUserPlus as UserPlus,
  TbPhone as Phone,
  TbX as X,
  TbCheck as Check,
  TbCreditCard as CreditCard,
  TbCash as Cash,
  TbQrcode as QrCode,
  TbPrinter as Printer
} from 'react-icons/tb';
import { billingService } from '@/services/billingService';
import { inventoryService, newIdempotencyKey } from '@/services/inventoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Select, FormField, LoadingState, EmptyState, ConfirmDialog } from '@/components/ui';
import { ScannerInput } from '@/components/inventory/ScannerInput';
import { ProductSearch, MatchChooser } from '@/components/inventory/ProductSearch';
import { ProductThumb } from '@/components/inventory/ProductThumb';
import { computeInvoice } from '@/utils/invoiceCalc';
import { money, qty, PAYMENT_METHODS } from '@/utils/format';
import { amountToWords } from '@/utils/numberToWords';
import '@/components/inventory/inventory.scss';
import './billing.scss';

const DRAFT_KEY = 'pmart_invoice_draft';
const TAX_MODES = [
  { value: 'NONE', label: 'बिना GST बिल (Non-GST)' },
  { value: 'EXCLUSIVE', label: 'कीमत पर GST जोड़ें (+GST)' },
  { value: 'INCLUSIVE', label: 'कीमत में GST शामिल है (Inc. GST)' }
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
  paymentMode: 'CASH', // CASH, UPI, CARD, CREDIT, SPLIT
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
    // Storage unavailable
  }
};

export const CreateInvoicePage = () => {
  const { can } = useAuth();
  const { t, lang, speak } = useLanguage();
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
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const qtyInputRefs = useRef({});

  // Quick Customer Registration Modal
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

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

  const addProduct = useCallback(
    (p, qtyToAdd = 1) => {
      setChoices(null);
      setNotFound('');
      const addCount = Number(qtyToAdd) > 0 ? Number(qtyToAdd) : 1;
      setDraft((d) => {
        const existingIdx = d.lines.findIndex((l) => l.product._id === p._id);
        if (existingIdx >= 0) {
          const existing = d.lines[existingIdx];
          const nextQty = Math.round(((Number(existing.quantity) || 0) + addCount) * 1000) / 1000;
          setSelectedLineIndex(existingIdx);
          return {
            ...d,
            lines: d.lines.map((l, idx) => (idx === existingIdx ? { ...l, quantity: String(nextQty) } : l))
          };
        }
        const newKey = `${p._id}-${Date.now()}`;
        const newLines = [...d.lines, { key: newKey, product: p, quantity: String(addCount), unitPrice: '', discount: '', taxRate: '' }];
        setSelectedLineIndex(newLines.length - 1);
        return {
          ...d,
          lines: newLines
        };
      });
      speak('voice.product_added');
      setTimeout(() => scanner.current?.focus(), 0);
    },
    [speak]
  );

  const onScan = useCallback(
    async (rawCode) => {
      setLooking(true);
      // Support multiplier format: e.g. "5*8906009082" or "8906009082*5" or "10xVIM"
      let code = String(rawCode || '').trim();
      let multiplier = 1;
      const leadingMult = code.match(/^(\d+(?:\.\d+)?)\s*[*xX]\s*(.+)$/);
      const trailingMult = code.match(/^(.+?)\s*[*xX]\s*(\d+(?:\.\d+)?)$/);
      if (leadingMult) {
        multiplier = Number(leadingMult[1]) || 1;
        code = leadingMult[2].trim();
      } else if (trailingMult) {
        code = trailingMult[1].trim();
        multiplier = Number(trailingMult[2]) || 1;
      }

      try {
        const { matches } = await inventoryService.lookup(code);
        if (matches.length === 0) {
          setNotFound(code);
          toast.warn(lang === 'hi' ? `बारकोड ${code} नहीं मिला` : `Barcode ${code} not found`);
        } else if (matches.length === 1) {
          addProduct(matches[0], multiplier);
        } else {
          setChoices({ code, matches, multiplier });
        }
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Lookup failed.'));
      } finally {
        setLooking(false);
      }
    },
    [addProduct, toast, lang]
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

  const total = computed?.grandTotal || 0;
  const paying = draft?.payLater ? 0 : (draft?.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = Math.round((total - paying) * 100) / 100;

  // Handle Quick Payment Mode Click
  const handlePaymentModeSelect = (mode) => {
    if (!draft) return;
    if (mode === 'CREDIT') {
      update({ paymentMode: 'CREDIT', payLater: true, payments: [] });
    } else if (mode === 'SPLIT') {
      update({
        paymentMode: 'SPLIT',
        payLater: false,
        payments: draft.payments.length > 0 ? draft.payments : [{ method: 'CASH', amount: String(Math.floor(total / 2)), reference: '' }, { method: 'UPI', amount: String(Math.ceil(total / 2)), reference: '' }]
      });
    } else {
      // CASH, UPI, CARD (Full payment)
      update({
        paymentMode: mode,
        payLater: false,
        payments: [{ method: mode, amount: String(total), reference: '' }]
      });
    }
  };

  const handleQuickAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;
    try {
      const res = await billingService.createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        address: newCustAddress.trim()
      });
      update({ customerName: res.name, customerPhone: res.phone });
      setShowAddCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      toast.success(lang === 'hi' ? 'ग्राहक जुड़ गया' : 'Customer added');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to add customer'));
    }
  };

  const submit = async () => {
    if (!draft || !settings) return;
    setError('');
    if (draft.lines.length === 0) return setError(lang === 'hi' ? 'कृपया कम से कम एक सामान बिल में जोड़ें।' : 'Scan or add at least one product.');
    for (const l of draft.lines) {
      const q = Number(l.quantity);
      if (!(q > 0)) return setError(lang === 'hi' ? `${l.product.name} की मात्रा 0 से अधिक होनी चाहिए।` : `Enter a quantity above 0 for ${l.product.name}.`);
      const price = l.unitPrice !== '' ? Number(l.unitPrice) : l.product.price;
      if (!(price > 0) && l.unitPrice === '') return setError(lang === 'hi' ? `${l.product.name} की कोई बेचने की कीमत नहीं है।` : `${l.product.name} has no selling price.`);
    }
    if (paying > total + 0.005) return setError(lang === 'hi' ? 'भुगतान कुल बिल राशि से अधिक है।' : 'Payments are more than the invoice total.');

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
      speak('voice.invoice_ready');
      toast.success(lang === 'hi' ? `बिल ${invoice.number} सफलतापूर्वक बन गया!` : `Invoice ${invoice.number} created!`);
      navigate(`/admin/billing/invoices/${invoice._id}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the invoice.'));
    } finally {
      setSaving(false);
    }
  };

  // Keyboard Shortcuts for POS Billing Counter (Alt+Q, +/-, Up/Down, Del, Alt+1..5, Alt+C, Alt+X, Ctrl+Enter)
  useEffect(() => {
    const handlePosKeys = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      const isQtyInput = e.target.classList?.contains('pos-qty-input');

      // Ctrl + Enter -> Complete and Print Bill
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (!saving && draft && draft.lines.length > 0) {
          submit();
        }
        return;
      }

      // Alt + C -> Quick Customer Registration / Search
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setShowAddCustomer(true);
        return;
      }

      // Alt + X -> Clear Cart
      if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        if (draft && draft.lines.length > 0) {
          setConfirmClear(true);
        }
        return;
      }

      // Alt + Q or F5 -> Focus Quantity Input of Selected Line
      if ((e.altKey && (e.key === 'q' || e.key === 'Q')) || e.key === 'F5') {
        e.preventDefault();
        if (draft && draft.lines.length > 0) {
          const idx = Math.min(selectedLineIndex, draft.lines.length - 1);
          const line = draft.lines[idx] || draft.lines[draft.lines.length - 1];
          if (line && qtyInputRefs.current[line.key]) {
            qtyInputRefs.current[line.key].focus();
            qtyInputRefs.current[line.key].select();
          }
        }
        return;
      }

      // Increase Quantity (+ or Alt + + or Alt + = or NumpadAdd)
      const isPlus = e.key === '+' || e.key === '=' || e.code === 'NumpadAdd';
      if ((e.altKey && isPlus) || ((!isInput || isQtyInput) && isPlus)) {
        e.preventDefault();
        if (draft && draft.lines.length > 0) {
          const idx = Math.min(selectedLineIndex, draft.lines.length - 1);
          const line = draft.lines[idx];
          if (line) {
            const current = parseFloat(line.quantity) || 0;
            const next = Math.round((current + 1) * 1000) / 1000;
            setLine(line.key, { quantity: String(next) });
          }
        }
        return;
      }

      // Decrease Quantity (- or Alt + - or Alt + _ or NumpadSubtract)
      const isMinus = e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract';
      if ((e.altKey && isMinus) || ((!isInput || isQtyInput) && isMinus)) {
        e.preventDefault();
        if (draft && draft.lines.length > 0) {
          const idx = Math.min(selectedLineIndex, draft.lines.length - 1);
          const line = draft.lines[idx];
          if (line) {
            const current = parseFloat(line.quantity) || 1;
            const next = Math.max(1, Math.round((current - 1) * 1000) / 1000);
            setLine(line.key, { quantity: String(next) });
          }
        }
        return;
      }

      // Navigate Cart Lines: ArrowUp / ArrowDown
      if ((!isInput || isQtyInput) && e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedLineIndex((prev) => {
          const next = Math.max(0, prev - 1);
          if (isQtyInput && draft?.lines?.[next]) {
            setTimeout(() => {
              const el = qtyInputRefs.current[draft.lines[next].key];
              el?.focus();
              el?.select();
            }, 0);
          }
          return next;
        });
        return;
      }
      if ((!isInput || isQtyInput) && e.key === 'ArrowDown') {
        e.preventDefault();
        if (draft && draft.lines.length > 0) {
          setSelectedLineIndex((prev) => {
            const next = Math.min(draft.lines.length - 1, prev + 1);
            if (isQtyInput && draft?.lines?.[next]) {
              setTimeout(() => {
                const el = qtyInputRefs.current[draft.lines[next].key];
                el?.focus();
                el?.select();
              }, 0);
            }
            return next;
          });
        }
        return;
      }

      // Delete Selected Line: Delete or Alt + D
      if ((e.altKey && (e.key === 'd' || e.key === 'D')) || (!isInput && e.key === 'Delete')) {
        e.preventDefault();
        if (draft && draft.lines.length > 0) {
          const idx = Math.min(selectedLineIndex, draft.lines.length - 1);
          const line = draft.lines[idx];
          if (line) {
            setDraft((d) => ({ ...d, lines: d.lines.filter((x) => x.key !== line.key) }));
            setSelectedLineIndex((prev) => Math.max(0, Math.min(prev, draft.lines.length - 2)));
            scanner.current?.focus();
          }
        }
        return;
      }

      // Alt + 1 -> Cash Payment
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        handlePaymentModeSelect('CASH');
        return;
      }

      // Alt + 2 -> UPI Payment
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        handlePaymentModeSelect('UPI');
        return;
      }

      // Alt + 3 -> Card Payment
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        handlePaymentModeSelect('CARD');
        return;
      }

      // Alt + 4 -> Credit (Udhar)
      if (e.altKey && e.key === '4') {
        e.preventDefault();
        handlePaymentModeSelect('CREDIT');
        return;
      }

      // Alt + 5 -> Split Payment
      if (e.altKey && e.key === '5') {
        e.preventDefault();
        handlePaymentModeSelect('SPLIT');
        return;
      }
    };

    window.addEventListener('keydown', handlePosKeys);
    return () => window.removeEventListener('keydown', handlePosKeys);
  }, [draft, saving, total, paying, selectedLineIndex]);

  // Loading / Error Early Return (MUST BE AFTER ALL HOOKS TO COMPLY WITH REACT RULES OF HOOKS)
  if (!draft || !settings) {
    return error ? <div className="alert alert-error">{error}</div> : <LoadingState text={t('ui.loading', 'Loading billing...')} />;
  }

  return (
    <div className="create-invoice-container">
      <PageHeader
        title={t('billing.pos_title', 'New Invoice (POS Billing)')}
        subtitle={t('help.billing', 'Scan products, adjust quantities and generate the bill.')}
        action={
          draft.lines.length > 0 && (
            <Button variant="secondary" onClick={() => setConfirmClear(true)}>
              <Trash2 size={16} style={{ marginRight: 6 }} />
              <span>{t('billing.clear_bill', 'Clear Bill')}</span>
              <kbd className="shortcut-kbd-badge" style={{ marginLeft: 6 }}>Alt+X</kbd>
            </Button>
          )
        }
      />

      {error && (
        <div className="alert alert-error mb-4">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="split-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(360px, 1fr)', gap: 20 }}>
        {/* Left Side: Product Scanner & Bill Cart */}
        <div>
          <Card className="mb-4" style={{ border: '2px solid #cbd5e1' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ScannerInput ref={scanner} onScan={onScan} busy={looking} label={lang === 'hi' ? 'बारकोड स्कैनर (स्कैन करें)' : 'Scan Barcode'} />
              <div>
                <span className="block text-sm font-semibold mb-1">{lang === 'hi' ? 'या नाम / SKU से खोजें' : 'Or Search by Name / SKU'}</span>
                <ProductSearch onSelect={addProduct} />
              </div>
            </div>

            {notFound && (
              <div className="alert alert-warning mt-3">
                <AlertTriangle size={16} />
                <span>
                  {lang === 'hi' ? `बारकोड या कोड ${notFound} का सामान नहीं मिला। ` : `No product with barcode ${notFound}. `}
                  {can('catalog.manage') ? (
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/products/new?barcode=${encodeURIComponent(notFound)}`)}>
                      {lang === 'hi' ? 'नया सामान जोड़ें' : 'Add product'}
                    </Button>
                  ) : (
                    'Ask an administrator to add it.'
                  )}
                </span>
              </div>
            )}
          </Card>

          {draft.lines.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={lang === 'hi' ? 'बिल में अभी कोई सामान नहीं है' : 'Cart is empty'}
              description={t('help.billing', 'Scan products, adjust quantities and generate the bill.')}
            />
          ) : (
            <div className="pmart-table-wrapper overflow-x-auto card">
              <table className="pmart-table is-dense pos-billing-table">
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center' }}>#</th>
                    <th>{t('billing.item', 'Product')}</th>
                    <th className="num" style={{ width: 120, textAlign: 'center' }}>
                      {t('billing.qty', 'Quantity')}
                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 'normal', marginLeft: 4 }}>[Alt+Q]</span>
                    </th>
                    <th className="num" style={{ width: 85, textAlign: 'right' }}>{lang === 'hi' ? 'एमआरपी' : 'MRP'}</th>
                    <th className="num" style={{ width: 100, textAlign: 'right' }}>{t('billing.unit_price', 'Price')}</th>
                    <th className="num" style={{ width: 90, textAlign: 'right' }}>{t('billing.discount', 'Discount')}</th>
                    {draft.taxMode !== 'NONE' && <th className="num" style={{ width: 75, textAlign: 'right' }}>GST %</th>}
                    <th className="num" style={{ width: 95, textAlign: 'right' }}>{t('billing.total', 'Total')}</th>
                    <th style={{ width: 44, textAlign: 'center' }} />
                  </tr>
                </thead>
                <tbody>
                  {draft.lines.map((l, i) => {
                    const c = computed.items[i];
                    const q = Number(l.quantity) || 0;
                    const short = q > l.product.stockCount;
                    const isSelected = i === selectedLineIndex;
                    return (
                      <tr
                        key={l.key}
                        onClick={() => setSelectedLineIndex(i)}
                        className={`${short ? 'stock-warning-row' : ''} ${isSelected ? 'pos-selected-row' : ''}`.trim()}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ width: 36, textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <ProductThumb product={l.product} size="sm" />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <strong style={{ fontSize: 13, color: '#0f172a' }}>{l.product.name}</strong>
                              <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span className="mono">{l.product.code || l.product.barcode || ''}</span>
                                <span style={{ color: short ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                                  ({lang === 'hi' ? 'स्टॉक: ' : 'Stock: '} {l.product.stockCount})
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ width: 120, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div className="pos-qty-stepper">
                            <button
                              type="button"
                              className="btn-stepper"
                              onClick={() => {
                                const current = parseFloat(l.quantity) || 1;
                                const next = Math.max(1, Math.round((current - 1) * 1000) / 1000);
                                setLine(l.key, { quantity: String(next) });
                                setSelectedLineIndex(i);
                              }}
                              aria-label="Decrease quantity"
                              title="Decrease (-)"
                            >
                              −
                            </button>
                            <input
                              ref={(el) => {
                                if (el) qtyInputRefs.current[l.key] = el;
                              }}
                              type="text"
                              inputMode="decimal"
                              className="pos-qty-input"
                              value={l.quantity}
                              onFocus={(e) => {
                                setSelectedLineIndex(i);
                                e.target.select();
                              }}
                              onBlur={() => {
                                const parsed = parseFloat(l.quantity);
                                if (!parsed || parsed <= 0 || isNaN(parsed)) {
                                  setLine(l.key, { quantity: '1' });
                                } else {
                                  setLine(l.key, { quantity: String(Math.round(parsed * 1000) / 1000) });
                                }
                              }}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                setLine(l.key, { quantity: val });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
                                  e.preventDefault();
                                  const current = parseFloat(l.quantity) || 0;
                                  setLine(l.key, { quantity: String(Math.round((current + 1) * 1000) / 1000) });
                                } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
                                  e.preventDefault();
                                  const current = parseFloat(l.quantity) || 1;
                                  const next = Math.max(1, Math.round((current - 1) * 1000) / 1000);
                                  setLine(l.key, { quantity: String(next) });
                                } else if (e.key === 'Enter' || e.key === 'Escape') {
                                  e.preventDefault();
                                  scanner.current?.focus();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="btn-stepper"
                              onClick={() => {
                                const current = parseFloat(l.quantity) || 0;
                                const next = Math.round((current + 1) * 1000) / 1000;
                                setLine(l.key, { quantity: String(next) });
                                setSelectedLineIndex(i);
                              }}
                              aria-label="Increase quantity"
                              title="Increase (+)"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="num" style={{ width: 85, color: '#64748b' }}>
                          {l.product.mrp ? money(l.product.mrp) : '—'}
                        </td>
                        <td className="num" style={{ width: 100 }} onClick={(e) => e.stopPropagation()}>
                          {override ? (
                            <input
                              type="number"
                              className="money-input-sm"
                              value={l.unitPrice !== '' ? l.unitPrice : l.product.price}
                              onChange={(e) => setLine(l.key, { unitPrice: e.target.value })}
                              style={{ width: 78 }}
                            />
                          ) : (
                            money(l.product.price)
                          )}
                        </td>
                        <td className="num" style={{ width: 90 }} onClick={(e) => e.stopPropagation()}>
                          {override ? (
                            <input
                              type="number"
                              className="money-input-sm"
                              min="0"
                              placeholder="0"
                              value={l.discount}
                              onChange={(e) => setLine(l.key, { discount: e.target.value })}
                              style={{ width: 68 }}
                            />
                          ) : l.discount > 0 ? (
                            `−${money(l.discount)}`
                          ) : (
                            '—'
                          )}
                        </td>
                        {draft.taxMode !== 'NONE' && (
                          <td className="num" style={{ width: 75 }}>{c?.taxRate ?? l.product.taxRate ?? 0}%</td>
                        )}
                        <td className="num font-bold" style={{ width: 95, fontSize: 14 }}>{money(c?.lineTotal || 0)}</td>
                        <td style={{ width: 44, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-remove-line"
                            onClick={() => update({ lines: draft.lines.filter((x) => x.key !== l.key) })}
                            aria-label="Remove item"
                            title={lang === 'hi' ? 'हटाएं (Del)' : 'Remove (Del)'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* POS Keyboard Shortcut Footer */}
              <div className="pos-shortcuts-bar">
                <span className="pos-shortcut-pill">
                  <kbd>Alt+Q</kbd> / <kbd>F5</kbd> {lang === 'hi' ? 'मात्रा बदलें' : 'Change Qty'}
                </span>
                <span className="pos-shortcut-pill">
                  <kbd>+</kbd> <kbd>−</kbd> {lang === 'hi' ? 'मात्रा घटाएं/बढ़ाएं' : 'Qty + / -'}
                </span>
                <span className="pos-shortcut-pill">
                  <kbd>↑</kbd> <kbd>↓</kbd> {lang === 'hi' ? 'सामान चुनें' : 'Select Item'}
                </span>
                <span className="pos-shortcut-pill">
                  <kbd>Del</kbd> {lang === 'hi' ? 'सामान हटाएं' : 'Delete Item'}
                </span>
                <span className="pos-shortcut-pill">
                  <kbd>5*कोड</kbd> {lang === 'hi' ? 'मल्टी-स्कैन' : 'Multi-scan'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Customer, Calculations & Large Payment Buttons */}
        <div>
          {/* Customer Selection Card */}
          <Card className="mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 className="section-heading m-0">{t('nav.customers', 'Customer')}</h3>
              <Button size="sm" variant="secondary" onClick={() => setShowAddCustomer(true)}>
                <UserPlus size={14} style={{ marginRight: 4 }} />
                <span>{t('billing.quick_add_customer', '+ New Customer')}</span>
                <kbd className="shortcut-kbd-badge" style={{ marginLeft: 6 }}>Alt+C</kbd>
              </Button>
            </div>

            <FormField label={t('customers.phone', 'Customer Phone or Name')}>
              <Input
                list="billing-customer-list"
                value={draft.customerPhone}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = customers.find((c) => c.phone === val || c.name === val);
                  if (matched) {
                    update({ customerPhone: matched.phone, customerName: matched.name, customerGstin: matched.gstin || '' });
                  } else {
                    update({ customerPhone: val });
                  }
                }}
                placeholder={t('billing.search_customer_placeholder', 'Type name or phone number...')}
              />
              <datalist id="billing-customer-list">
                {customers.map((c) => (
                  <option key={c._id} value={c.phone}>{`${c.name || ''}${c.outstanding ? ` · owes ${money(c.outstanding)}` : ''}`}</option>
                ))}
              </datalist>
            </FormField>

            <FormField label={t('customers.name', 'Customer Name')}>
              <Input
                value={draft.customerName}
                onChange={(e) => update({ customerName: e.target.value })}
                placeholder={t('billing.walk_in', 'Walk-in Customer')}
              />
            </FormField>
          </Card>

          {/* Totals & Bill Summary */}
          <Card className="mb-4">
            <h3 className="section-heading mb-3">{lang === 'hi' ? 'बिल का हिसाब (योग)' : 'Bill Summary'}</h3>

            <div className="summary-lines" style={{ fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>{t('billing.subtotal', 'Subtotal')}</span>
                <span className="num">{money(computed.subtotal)}</span>
              </div>

              {computed.itemDiscountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#16a34a' }}>
                  <span>{lang === 'hi' ? 'सामान पर छूट' : 'Item Discounts'}</span>
                  <span className="num">−{money(computed.itemDiscountTotal)}</span>
                </div>
              )}

              {draft.taxMode !== 'NONE' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{settings.taxLabel || 'GST'}</span>
                  <span className="num">{money(computed.taxTotal)}</span>
                </div>
              )}

              {computed.roundOff !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{t('billing.round_off', 'Round off')}</span>
                  <span className="num">{money(computed.roundOff)}</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '2px dashed #cbd5e1',
                  paddingTop: 8,
                  marginTop: 6,
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#0f172a'
                }}
              >
                <span>{t('nav.total_amount', 'Total Amount')}</span>
                <span className="text-emerald-700">{money(total)}</span>
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: 6, borderRadius: 6 }}>
              {amountToWords(total, lang)}
            </div>
          </Card>

          {/* Large Touch Payment Buttons (Requirement 4) */}
          <Card className="mb-4">
            <h3 className="section-heading mb-3">{t('billing.payment_options', 'Payment Mode')}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
              <button
                type="button"
                className={`pos-pay-btn ${draft.paymentMode === 'CASH' && !draft.payLater ? 'is-selected' : ''}`}
                onClick={() => handlePaymentModeSelect('CASH')}
              >
                <Cash size={22} />
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span>{t('billing.cash', 'Cash')}</span>
                  <kbd className="shortcut-kbd-badge">Alt+1</kbd>
                </span>
              </button>

              <button
                type="button"
                className={`pos-pay-btn ${draft.paymentMode === 'UPI' && !draft.payLater ? 'is-selected' : ''}`}
                onClick={() => handlePaymentModeSelect('UPI')}
              >
                <QrCode size={22} />
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span>UPI</span>
                  <kbd className="shortcut-kbd-badge">Alt+2</kbd>
                </span>
              </button>

              <button
                type="button"
                className={`pos-pay-btn ${draft.paymentMode === 'CARD' && !draft.payLater ? 'is-selected' : ''}`}
                onClick={() => handlePaymentModeSelect('CARD')}
              >
                <CreditCard size={22} />
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span>{t('billing.card', 'Card')}</span>
                  <kbd className="shortcut-kbd-badge">Alt+3</kbd>
                </span>
              </button>

              <button
                type="button"
                className={`pos-pay-btn ${draft.payLater ? 'is-selected-alert' : ''}`}
                onClick={() => handlePaymentModeSelect('CREDIT')}
              >
                <span>🤝</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span>{t('billing.credit', 'Credit / Udhar')}</span>
                  <kbd className="shortcut-kbd-badge">Alt+4</kbd>
                </span>
              </button>
            </div>

            <button
              type="button"
              className={`btn btn-secondary w-full mb-3 ${draft.paymentMode === 'SPLIT' ? 'border-primary font-bold' : ''}`}
              onClick={() => handlePaymentModeSelect('SPLIT')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span>{t('billing.split', 'Split Payment (दो तरीकों से)')}</span>
              <kbd className="shortcut-kbd-badge">Alt+5</kbd>
            </button>

            {/* Split / Multiple Payment Row Details */}
            {draft.paymentMode === 'SPLIT' && !draft.payLater && (
              <div className="p-3 mb-3" style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span className="block text-xs font-bold text-slate-600 mb-2">{lang === 'hi' ? 'अलग-अलग भुगतान की रकम दर्ज करें:' : 'Enter split breakdown:'}</span>
                {draft.payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                    <Select
                      value={p.method}
                      onChange={(e) => update({ payments: draft.payments.map((x, j) => (j === i ? { ...x, method: e.target.value } : x)) })}
                      style={{ width: 100 }}
                    >
                      <option value="CASH">नकद</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">कार्ड</option>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={p.amount}
                      onChange={(e) => update({ payments: draft.payments.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)) })}
                      style={{ flex: 1, fontWeight: 'bold' }}
                    />
                    {draft.payments.length > 1 && (
                      <Button variant="icon" onClick={() => update({ payments: draft.payments.filter((_, j) => j !== i) })}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                {draft.payments.length < 4 && (
                  <Button size="sm" variant="secondary" onClick={() => update({ payments: [...draft.payments, { method: 'UPI', amount: '', reference: '' }] })}>
                    <Plus size={14} style={{ marginRight: 4 }} />
                    {lang === 'hi' ? '+ अन्य माध्यम जोड़ें' : '+ Add Method'}
                  </Button>
                )}
              </div>
            )}

            {/* Payment Summary Box */}
            <div className="p-3" style={{ background: '#f1f5f9', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{t('billing.received_amount', 'Amount Received')}:</span>
                <strong className="text-emerald-700">{money(paying)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                <span className={balance > 0 ? 'text-red-600 font-bold' : ''}>{t('billing.balance_amount', 'Remaining Balance')}:</span>
                <strong className={balance > 0 ? 'text-red-600 font-bold' : 'text-slate-800'}>
                  {money(balance)}
                </strong>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-4"
              disabled={saving || draft.lines.length === 0}
              onClick={submit}
              style={{ fontSize: 18, padding: '14px 20px', borderRadius: 10 }}
            >
              <Printer size={20} style={{ marginRight: 8 }} />
              {saving ? (
                t('ui.loading', 'Creating Bill...')
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span>{t('billing.generate_invoice', 'Generate & Print Invoice')}</span>
                  <kbd
                    className="shortcut-kbd-badge"
                    style={{
                      background: 'rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      padding: '2px 6px'
                    }}
                  >
                    Ctrl+Enter
                  </kbd>
                </span>
              )}
            </Button>
          </Card>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showAddCustomer && (
        <div className="modal-overlay" onClick={() => setShowAddCustomer(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleQuickAddCustomerSubmit}>
              <div className="modal-head">
                <h3>{t('customers.add_new', 'Quick Add Customer')}</h3>
                <Button type="button" variant="ghost" onClick={() => setShowAddCustomer(false)}><X size={18} /></Button>
              </div>
              <div className="modal-body">
                <FormField label={t('customers.name', 'Customer Name')} required>
                  <Input required autoFocus value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="e.g. Ramesh Kumar" />
                </FormField>
                <FormField label={t('customers.phone', 'Phone Number')} required>
                  <Input required value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="9876543210" />
                </FormField>
                <FormField label={t('customers.address', 'Address')}>
                  <Input value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} placeholder="Shop or home address" />
                </FormField>
              </div>
              <div className="modal-foot">
                <Button type="button" variant="secondary" onClick={() => setShowAddCustomer(false)}>{t('nav.cancel', 'Cancel')}</Button>
                <Button type="submit" variant="primary">{t('nav.save', 'Add to Bill')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Bill Confirmation */}
      <ConfirmDialog
        open={confirmClear}
        title={t('billing.clear_bill', 'Clear Bill')}
        message={t('billing.confirm_clear', 'Are you sure you want to clear this bill?')}
        confirmText={lang === 'hi' ? 'हाँ, खाली करें' : 'Clear'}
        cancelText={t('nav.cancel', 'Cancel')}
        danger
        onConfirm={() => {
          setDraft(emptyDraft(settings?.taxMode));
          saveDraft(null);
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
};
