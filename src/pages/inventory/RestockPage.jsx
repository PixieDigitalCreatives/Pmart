import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TbPackageImport as PackagePlus, TbDeviceFloppy as Save, TbAlertTriangle as AlertTriangle, TbX as X } from 'react-icons/tb';
import { inventoryService, newIdempotencyKey } from '@/services/inventoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, FormField, EmptyState, LoadingState } from '@/components/ui';
import { ScannerInput } from '@/components/inventory/ScannerInput';
import { ProductSearch, MatchChooser } from '@/components/inventory/ProductSearch';
import { ProductThumb, StockBadge } from '@/components/inventory/ProductThumb';
import { Pagination } from '@/components/inventory/Pagination';
import { money, qty, dateTime } from '@/utils/format';

const EMPTY = { receivedQuantity: '', freeQuantity: '', purchaseRate: '', supplierName: '', referenceNumber: '', note: '' };

/** Receive stock by scanning or searching. New stock = previous + received + free; each save is one ledger entry. */
export const RestockPage = () => {
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const scanner = useRef(null);
  const received = useRef(null);

  const [looking, setLooking] = useState(false);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [idemKey, setIdemKey] = useState(newIdempotencyKey());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState('');
  const [choices, setChoices] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [history, setHistory] = useState({ rows: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [historyPage, setHistoryPage] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await inventoryService.listRestocks({ page: historyPage, limit: 15 }));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load restock history.'));
    } finally {
      setLoadingHistory(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const current = useRef(null);
  const select = useCallback((p) => {
    setChoices(null);
    setNotFound('');
    setError('');
    if (current.current && current.current._id === p._id) {
      // Scanning the same product again counts one more unit received.
      setForm((f) => ({ ...f, receivedQuantity: String((Number(f.receivedQuantity) || 0) + 1) }));
    } else {
      current.current = p;
      setProduct(p);
      setForm({ ...EMPTY, purchaseRate: p.purRate ? String(p.purRate) : '', supplierName: p.company || '' });
      setIdemKey(newIdempotencyKey());
    }
    setTimeout(() => received.current?.focus(), 0);
  }, []);

  const onScan = useCallback(
    async (code) => {
      setLooking(true);
      setNotFound('');
      try {
        const { matches } = await inventoryService.lookup(code);
        if (matches.length === 0) setNotFound(code);
        else if (matches.length === 1) select(matches[0]);
        else setChoices({ code, matches });
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Lookup failed.'));
      } finally {
        setLooking(false);
      }
    },
    [select, toast]
  );

  useEffect(() => {
    if (!product) return undefined;
    const t = setTimeout(() => {
      inventoryService
        .suppliers(form.supplierName)
        .then(setSuppliers)
        .catch(() => setSuppliers([]));
    }, 250);
    return () => clearTimeout(t);
  }, [form.supplierName, product]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const rec = Number(form.receivedQuantity) || 0;
  const free = Number(form.freeQuantity) || 0;
  const newStock = product ? Math.round((product.stockCount + rec + free) * 1000) / 1000 : 0;

  const clear = () => {
    current.current = null;
    setProduct(null);
    setForm(EMPTY);
    setError('');
    setTimeout(() => scanner.current?.focus(), 0);
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const rate = form.purchaseRate === '' ? null : Number(form.purchaseRate);
    if (rec < 0 || free < 0 || !Number.isFinite(rec) || !Number.isFinite(free)) return setError('Quantities must be 0 or more.');
    if (rec + free <= 0) return setError('Enter the received or free quantity.');
    if (rate !== null && (!Number.isFinite(rate) || rate < 0)) return setError('Enter a valid purchase rate.');
    setSaving(true);
    try {
      const { restock, product: updated } = await inventoryService.restock({
        product: product._id,
        receivedQuantity: rec,
        freeQuantity: free,
        purchaseRate: rate,
        supplierName: form.supplierName.trim(),
        referenceNumber: form.referenceNumber.trim(),
        note: form.note.trim(),
        idempotencyKey: idemKey
      });
      toast.success(`${restock.number}: ${updated.name} now ${qty(updated.stockCount)} ${updated.unit || ''}`);
      clear();
      setHistoryPage(1);
      loadHistory();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the restock.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Restock inventory" subtitle="Scan or search a product, enter what arrived, and save. Every restock is recorded in the stock ledger." />

      <Card className="mb-4">
        <div className="grid md:grid-cols-2 gap-4">
          <ScannerInput ref={scanner} onScan={onScan} busy={looking} label="Scan barcode" />
          <div>
            <span className="scanner-input-label block text-sm font-semibold mb-1">Or search manually</span>
            <ProductSearch onSelect={select} />
          </div>
        </div>
        {notFound && (
          <div className="alert alert-warning mt-3">
            <AlertTriangle size={16} />
            <span>
              No product has the barcode or code <strong className="mono">{notFound}</strong>.{' '}
              {can('catalog.manage') ? (
                <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/products/new?barcode=${encodeURIComponent(notFound)}`)}>
                  Add it as a new product
                </Button>
              ) : (
                'Ask an administrator to add it.'
              )}
            </span>
          </div>
        )}
      </Card>

      {product && (
        <Card className="mb-4">
          <div className="flex gap-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <ProductThumb product={product} size={120} showLabel />
            <div className="flex-1" style={{ minWidth: 260 }}>
              <div className="flex justify-between items-start gap-2">
                <h2 className="text-lg font-bold">{product.name}</h2>
                <Button variant="icon" onClick={clear} aria-label="Clear product" title="Clear">
                  <X size={18} />
                </Button>
              </div>
              <div className="detail-grid mt-2">
                {[
                  ['Product code', <span className="mono">{product.code || '—'}</span>],
                  ['Barcode', <span className="mono">{product.barcode || '—'}</span>],
                  ['Current stock', <StockBadge stock={product.stockCount} unit={product.unit} />],
                  ['Purchase rate', money(product.purRate)],
                  ['MRP', money(product.mrp)],
                  ['Unit', product.unit || '—'],
                  ['Rack', product.rackNo || '—'],
                  ['Company', product.company || '—']
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="detail-label">{label}</div>
                    <div className="detail-value">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={save} className="mt-4">
            <div className="form-grid">
              <FormField label="Received quantity *" htmlFor="r-rec">
                <Input id="r-rec" ref={received} type="number" min="0" step="any" inputMode="decimal" value={form.receivedQuantity} onChange={set('receivedQuantity')} />
              </FormField>
              <FormField label="Free quantity" htmlFor="r-free">
                <Input id="r-free" type="number" min="0" step="any" inputMode="decimal" value={form.freeQuantity} onChange={set('freeQuantity')} />
              </FormField>
              <FormField label="Purchase rate (₹)" htmlFor="r-rate" hint={product.purRate ? `Current: ${money(product.purRate)}` : 'No purchase rate yet'}>
                <Input id="r-rate" type="number" min="0" step="0.01" inputMode="decimal" value={form.purchaseRate} onChange={set('purchaseRate')} />
              </FormField>
              <FormField label="Supplier / company" htmlFor="r-supplier">
                <Input id="r-supplier" list="r-supplier-list" value={form.supplierName} onChange={set('supplierName')} maxLength={120} />
                <datalist id="r-supplier-list">
                  {suppliers.map((s) => (
                    <option key={s._id || s.name} value={s.name} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Invoice / reference no." htmlFor="r-ref">
                <Input id="r-ref" value={form.referenceNumber} onChange={set('referenceNumber')} maxLength={60} />
              </FormField>
              <FormField label="Note" htmlFor="r-note">
                <Input id="r-note" value={form.note} onChange={set('note')} maxLength={300} />
              </FormField>
            </div>

            <div className="alert alert-info mb-3">
              <span>
                New stock = {qty(product.stockCount)} + {qty(rec)} received + {qty(free)} free = <strong>{qty(newStock)}</strong> {product.unit}
                {form.purchaseRate !== '' && Number(form.purchaseRate) !== (product.purRate || 0) && (
                  <> · Purchase rate changes from {money(product.purRate)} to {money(form.purchaseRate)}</>
                )}
              </span>
            </div>
            {error && (
              <div className="alert alert-error mb-3">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}
            <div className="actions-row">
              <Button type="submit" variant="primary" isLoading={saving}>
                <Save size={16} style={{ marginRight: 6 }} />
                Save restock
              </Button>
              <Button variant="secondary" onClick={clear} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <h3 className="section-heading mb-2">Recent restocks</h3>
      {loadingHistory ? (
        <LoadingState />
      ) : history.rows.length === 0 ? (
        <EmptyState icon={PackagePlus} title="No restocks yet" description="Restocks you save appear here." />
      ) : (
        <div className="pmart-table-wrapper overflow-x-auto">
          <table className="pmart-table is-dense">
            <thead>
              <tr>
                <th>No.</th>
                <th>Date</th>
                <th>Product</th>
                <th className="num">Received</th>
                <th className="num">Free</th>
                <th className="num">Rate</th>
                <th className="num">Amount</th>
                <th>Supplier</th>
                <th>Reference</th>
                <th className="num">Stock after</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {history.rows.map((r) => (
                <tr key={r._id}>
                  <td className="mono">{r.number}</td>
                  <td className="whitespace-nowrap">{dateTime(r.createdAt)}</td>
                  <td>
                    <Link to={`/admin/products/${r.product}`}>{r.productName}</Link>
                    <span className="cell-sub mono">{r.productCode}</span>
                  </td>
                  <td className="num">{qty(r.receivedQuantity)}</td>
                  <td className="num">{qty(r.freeQuantity)}</td>
                  <td className="num">{money(r.purchaseRate)}</td>
                  <td className="num">{money(r.amount)}</td>
                  <td>{r.supplierName || '—'}</td>
                  <td>{r.referenceNumber || '—'}</td>
                  <td className="num">{qty(r.stockAfter)}</td>
                  <td>{r.user?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={history.pagination.page} pages={history.pagination.pages} total={history.pagination.total} onChange={setHistoryPage} />

      <MatchChooser matches={choices?.matches} code={choices?.code} onPick={select} onClose={() => setChoices(null)} />
    </div>
  );
};
