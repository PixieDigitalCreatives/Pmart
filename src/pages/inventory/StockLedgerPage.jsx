import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TbHistory as History, TbAdjustmentsHorizontal as SlidersHorizontal } from 'react-icons/tb';
import { inventoryService, newIdempotencyKey } from '@/services/inventoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Button, Input, Select, FormField, Modal, LoadingState, EmptyState } from '@/components/ui';
import { ProductSearch, MatchChooser } from '@/components/inventory/ProductSearch';
import { ScannerInput } from '@/components/inventory/ScannerInput';
import { StockBadge } from '@/components/inventory/ProductThumb';
import { Pagination } from '@/components/inventory/Pagination';
import { qty, dateTime, MOVEMENT_LABEL } from '@/utils/format';
import '@/components/inventory/inventory.scss';

const REF_LINK = { INVOICE: (id) => `/admin/billing/invoices/${id}`, ORDER: (id) => `/admin/orders/${id}` };

/** Manual stock correction (inventory.adjust). Always needs a reason; recorded as an ADJUSTMENT movement. */
const AdjustModal = ({ isOpen, onClose, onSaved, initialProduct }) => {
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [mode, setMode] = useState('SET');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [key, setKey] = useState(newIdempotencyKey());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (isOpen) {
      setProduct(initialProduct || null);
      setMode('SET');
      setValue('');
      setReason('');
      setError('');
      setKey(newIdempotencyKey());
    }
  }, [isOpen, initialProduct]);

  const save = async (e) => {
    e.preventDefault();
    const n = Number(value);
    if (!product) return setError('Choose a product.');
    if (value === '' || !Number.isFinite(n)) return setError('Enter a number.');
    if (reason.trim().length < 3) return setError('Give a reason.');
    setSaving(true);
    setError('');
    try {
      await inventoryService.adjust({ product: product._id, mode, quantity: n, reason: reason.trim(), idempotencyKey: key });
      toast.success('Stock adjusted');
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const after = product ? (mode === 'SET' ? Number(value) || 0 : product.stockCount + (Number(value) || 0)) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust stock">
      <form onSubmit={save}>
        {product ? (
          <div className="alert alert-info mb-3">
            <span>
              <strong>{product.name}</strong> <span className="mono">{product.code}</span> — current stock <StockBadge stock={product.stockCount} unit={product.unit} />{' '}
              <button type="button" className="link-button" onClick={() => setProduct(null)}>
                change
              </button>
            </span>
          </div>
        ) : (
          <div className="mb-3">
            <ProductSearch onSelect={setProduct} />
          </div>
        )}
        <div className="form-grid">
          <FormField label="Adjustment" htmlFor="a-mode">
            <Select id="a-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="SET">Set stock to (physical count)</option>
              <option value="DELTA">Add or remove (use − to remove)</option>
            </Select>
          </FormField>
          <FormField label={mode === 'SET' ? 'Counted stock' : 'Change'} htmlFor="a-value">
            <Input id="a-value" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Reason *" htmlFor="a-reason" hint="e.g. stock count, damaged, expired, found">
          <Input id="a-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </FormField>
        {product && value !== '' && <p className="muted-note mb-3">Stock after: {qty(after)} {product.unit}</p>}
        {error && <div className="alert alert-error mb-3">{error}</div>}
        <Button type="submit" variant="primary" isLoading={saving}>
          Save adjustment
        </Button>
      </form>
    </Modal>
  );
};

/** Every stock movement: opening stock, restocks, invoice sales, cancellations, returns, adjustments, online orders. */
export const StockLedgerPage = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ search: '', type: '', from: '', to: '', product: params.get('product') || '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [looking, setLooking] = useState(false);
  const [choices, setChoices] = useState(null);

  const load = () =>
    inventoryService
      .transactions({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page })
      .then(setResult)
      .catch((err) => toast.error(apiErrorMessage(err, 'Could not load stock movements.')));

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const set = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1);
  };

  // A scan shows that product's movements; with Adjust stock open it picks the product to adjust.
  const pick = (p) => {
    setChoices(null);
    if (adjusting) return setAdjustProduct(p);
    setScannedProduct(p);
    setFilters((f) => ({ ...f, product: p._id }));
    setPage(1);
  };

  const onScan = async (code) => {
    setLooking(true);
    try {
      const { matches } = await inventoryService.lookup(code);
      if (matches.length === 1) pick(matches[0]);
      else if (matches.length > 1) setChoices({ code, matches });
      else toast.error(`No product has the barcode or code ${code}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Lookup failed.'));
    } finally {
      setLooking(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Stock ledger"
        subtitle="Every change to stock, with the level before and after. Stock is never changed without an entry here."
        action={
          can('inventory.adjust') && (
            <Button
              variant="secondary"
              onClick={() => {
                setAdjustProduct(null);
                setAdjusting(true);
              }}
            >
              <SlidersHorizontal size={16} style={{ marginRight: 6 }} />
              Adjust stock
            </Button>
          )
        }
      />
      <div className="mb-3">
        <ScannerInput onScan={onScan} busy={looking} autoFocus={false} placeholder="Scan a barcode to see that product's movements (or to pick it in Adjust stock)" />
      </div>
      <div className="toolbar">
        <div className="toolbar-grow">
          <Input value={filters.search} onChange={set('search')} placeholder="Product name, code or reference no." aria-label="Search movements" />
        </div>
        <Select value={filters.type} onChange={set('type')} aria-label="Movement type" style={{ width: 200 }}>
          <option value="">All movements</option>
          {Object.entries(MOVEMENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Input type="date" value={filters.from} onChange={set('from')} aria-label="From date" style={{ width: 150 }} />
        <Input type="date" value={filters.to} onChange={set('to')} aria-label="To date" style={{ width: 150 }} />
        {filters.product && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setScannedProduct(null);
              setFilters({ ...filters, product: '' });
            }}
          >
            {scannedProduct ? `${scannedProduct.name} only` : 'One product only'} ×
          </Button>
        )}
      </div>
      {!result ? (
        <LoadingState />
      ) : result.rows.length === 0 ? (
        <EmptyState icon={History} title="No stock movements" description="Restocks, sales and adjustments appear here." />
      ) : (
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
                <th>Reference</th>
                <th>Reason</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((m) => (
                <tr key={m._id}>
                  <td className="whitespace-nowrap">{dateTime(m.createdAt)}</td>
                  <td>{MOVEMENT_LABEL[m.type] || m.type}</td>
                  <td>
                    <Link to={`/admin/products/${m.product}`}>{m.productName}</Link>
                    <span className="cell-sub mono">{m.productCode}</span>
                  </td>
                  <td className={`num font-semibold ${m.quantity < 0 ? 'text-error' : 'text-success'}`}>
                    {m.quantity > 0 ? `+${qty(m.quantity)}` : qty(m.quantity)}
                    {m.freeQuantity > 0 && <span className="cell-sub">incl. {qty(m.freeQuantity)} free</span>}
                  </td>
                  <td className="num">{qty(m.stockBefore)}</td>
                  <td className="num">{qty(m.stockAfter)}</td>
                  <td className="mono">{REF_LINK[m.refType] && m.refId ? <Link to={REF_LINK[m.refType](m.refId)}>{m.refNumber}</Link> : m.refNumber || '—'}</td>
                  <td className="text-sm">{m.reason || '—'}</td>
                  <td>{m.user?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result && <Pagination page={result.pagination.page} pages={result.pagination.pages} total={result.pagination.total} onChange={setPage} />}
      <AdjustModal
        isOpen={adjusting}
        initialProduct={adjustProduct}
        onClose={() => setAdjusting(false)}
        onSaved={() => {
          setAdjusting(false);
          load();
        }}
      />
      <MatchChooser matches={choices?.matches} code={choices?.code} onPick={pick} onClose={() => setChoices(null)} />
    </div>
  );
};
