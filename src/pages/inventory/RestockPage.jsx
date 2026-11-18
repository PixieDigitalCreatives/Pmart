import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TbPackageImport as PackagePlus,
  TbDeviceFloppy as Save,
  TbAlertTriangle as AlertTriangle,
  TbX as X,
  TbCheck as Check,
  TbPlus as Plus,
  TbSearch as Search,
  TbBarcode as BarcodeIcon,
  TbArrowRight as ArrowRight
} from 'react-icons/tb';
import { inventoryService, newIdempotencyKey } from '@/services/inventoryService';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, FormField, EmptyState, LoadingState } from '@/components/ui';
import { ScannerInput } from '@/components/inventory/ScannerInput';
import { ProductSearch, MatchChooser } from '@/components/inventory/ProductSearch';
import { ProductThumb, StockBadge } from '@/components/inventory/ProductThumb';
import { Pagination } from '@/components/inventory/Pagination';
import { money, qty, dateTime } from '@/utils/format';

const EMPTY = { receivedQuantity: '', freeQuantity: '', purchaseRate: '', supplierName: '', referenceNumber: '', note: '' };

export const RestockPage = () => {
  const { can } = useAuth();
  const { t, lang, speak } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const scanner = useRef(null);
  const receivedInputRef = useRef(null);

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

  // Success summary banner of last restock
  const [lastRestockSummary, setLastRestockSummary] = useState(null);

  // Method C: New Product Quick Registration Modal
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newProd, setNewProd] = useState({
    name: '',
    barcode: '',
    category: '',
    cost: '', // purchase price
    price: '', // selling price
    stockCount: '', // initial stock
    taxRate: '0',
    imageUrl: ''
  });
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => []);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await inventoryService.listRestocks({ page: historyPage, limit: 15 }));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load restock history.'));
    } finally {
      setLoadingHistory(false);
    }
  }, [historyPage, toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const current = useRef(null);
  const select = useCallback((p) => {
    setChoices(null);
    setNotFound('');
    setError('');
    setLastRestockSummary(null);
    if (current.current && current.current._id === p._id) {
      setForm((f) => ({ ...f, receivedQuantity: String((Number(f.receivedQuantity) || 0) + 1) }));
    } else {
      current.current = p;
      setProduct(p);
      setForm({ ...EMPTY, purchaseRate: p.purRate ? String(p.purRate) : '', supplierName: p.company || '' });
      setIdemKey(newIdempotencyKey());
    }
    setTimeout(() => receivedInputRef.current?.focus(), 50);
  }, []);

  const onScan = useCallback(
    async (code) => {
      setLooking(true);
      setNotFound('');
      setLastRestockSummary(null);
      try {
        const { matches } = await inventoryService.lookup(code);
        if (matches.length === 0) {
          setNotFound(code);
          setNewProd((np) => ({ ...np, barcode: code }));
        } else if (matches.length === 1) {
          select(matches[0]);
        } else {
          setChoices({ code, matches });
        }
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

  const rec = Number(form.receivedQuantity) || 0;
  const free = Number(form.freeQuantity) || 0;
  const previousStock = product ? product.stockCount : 0;
  const updatedStock = product ? Math.round((previousStock + rec + free) * 1000) / 1000 : 0;

  const clear = () => {
    current.current = null;
    setProduct(null);
    setForm(EMPTY);
    setError('');
    setTimeout(() => scanner.current?.focus(), 0);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!product) return;
    const rate = form.purchaseRate === '' ? null : Number(form.purchaseRate);
    if (rec <= 0 && free <= 0) {
      setError(lang === 'hi' ? 'कृपया आने वाले सामान की मात्रा दर्ज करें।' : 'Enter received quantity.');
      return;
    }
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

      // Show the exact clear success example from requirement 6
      setLastRestockSummary({
        productName: updated.name,
        previousStock,
        addedStock: rec + free,
        updatedStock: updated.stockCount,
        unit: updated.unit || 'units'
      });

      speak('voice.stock_updated');
      toast.success(t('restock.success_msg', 'सामान का स्टॉक सफलतापूर्वक बढ़ गया है।'));
      clear();
      setHistoryPage(1);
      loadHistory();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the restock.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewProductSubmit = async (e) => {
    e.preventDefault();
    if (!newProd.name.trim()) {
      toast.error(lang === 'hi' ? 'कृपया सामान का नाम दर्ज करें' : 'Product name is required');
      return;
    }
    setSavingProduct(true);
    try {
      const created = await productService.createProduct({
        name: newProd.name.trim(),
        barcode: newProd.barcode.trim() || undefined,
        category: newProd.category || undefined,
        cost: Number(newProd.cost) || 0,
        price: Number(newProd.price) || 0,
        mrp: Number(newProd.price) || 0,
        stockCount: Number(newProd.stockCount) || 0,
        taxRate: Number(newProd.taxRate) || 0,
        imageUrl: newProd.imageUrl.trim() || undefined
      });

      toast.success(lang === 'hi' ? 'नया सामान रजिस्टर हो गया!' : 'New product registered!');
      setShowNewProductModal(false);
      setNotFound('');
      select(created);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create product'));
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div className="pmart-erp-page">
      <PageHeader
        title={t('restock.title', 'स्टॉक बढ़ाएं')}
        subtitle={t('help.restock', 'दुकान में नया सामान आया है तो यहां उसकी मात्रा बढ़ाएं।')}
      />

      {/* Success Summary Banner (Requirement 6 Example) */}
      {lastRestockSummary && (
        <div className="p-4 mb-4 rounded-xl" style={{ background: '#f0fdf4', border: '2px solid #86efac' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#15803d', fontWeight: 'bold', fontSize: 17, marginBottom: 8 }}>
            <Check size={24} />
            <span>{t('restock.success_msg', 'सामान का स्टॉक सफलतापूर्वक बढ़ गया है।')}</span>
          </div>
          <div className="grid md:grid-cols-4 gap-3 text-sm p-3 bg-white rounded-lg border border-emerald-100">
            <div>
              <span className="text-slate-500 block text-xs">{lang === 'hi' ? 'सामान का नाम' : 'Product'}:</span>
              <strong className="text-base text-slate-800">{lastRestockSummary.productName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">{lang === 'hi' ? 'पिछला स्टॉक' : 'Previous Stock'}:</span>
              <span className="text-base font-bold text-slate-600">{lastRestockSummary.previousStock} {lastRestockSummary.unit}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">{lang === 'hi' ? 'नया जुड़ा स्टॉक' : 'New Added'}:</span>
              <span className="text-base font-bold text-emerald-600">+{lastRestockSummary.addedStock} {lastRestockSummary.unit}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">{lang === 'hi' ? 'नया कुल स्टॉक' : 'Updated Stock'}:</span>
              <span className="text-lg font-black text-emerald-700">{lastRestockSummary.updatedStock} {lastRestockSummary.unit}</span>
            </div>
          </div>
        </div>
      )}

      {/* Input Methods: Barcode (Method A) & Name Search (Method B) */}
      <Card className="mb-4" style={{ border: '2px solid #cbd5e1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <span className="block text-sm font-bold text-slate-700 mb-1">
              <BarcodeIcon size={16} style={{ display: 'inline', marginRight: 4 }} />
              {t('restock.scan_method', 'तरीका 1: बारकोड स्कैन करें')}
            </span>
            <ScannerInput ref={scanner} onScan={onScan} busy={looking} label={lang === 'hi' ? 'बारकोड स्कैनर' : 'Scan Barcode'} />
          </div>
          <div>
            <span className="block text-sm font-bold text-slate-700 mb-1">
              <Search size={16} style={{ display: 'inline', marginRight: 4 }} />
              {t('restock.search_method', 'तरीका 2: नाम से खोजें')}
            </span>
            <ProductSearch onSelect={select} />
          </div>
        </div>

        {/* Method C: Product Not Found -> Quick Add Prompt */}
        {notFound && (
          <div className="alert alert-warning mt-4 p-4 rounded-xl" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <AlertTriangle size={20} style={{ color: '#d97706' }} />
            <div style={{ flex: 1 }}>
              <strong className="block text-base text-amber-900 mb-1">
                {t('restock.new_product_prompt', 'यह सामान अभी आपकी सूची में नहीं है। क्या आप इसे जोड़ना चाहते हैं?')}
              </strong>
              <span className="text-sm text-amber-700">
                {lang === 'hi' ? `स्कैन किया गया बारकोड: ` : `Scanned barcode: `}
                <code className="mono bg-amber-100 px-2 py-0.5 rounded font-bold">{notFound}</code>
              </span>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setNewProd({ name: '', barcode: notFound, category: '', cost: '', price: '', stockCount: '', taxRate: '0', imageUrl: '' });
                setShowNewProductModal(true);
              }}
            >
              <Plus size={16} style={{ marginRight: 4 }} />
              {lang === 'hi' ? 'हाँ, नया सामान जोड़ें' : 'Add New Product'}
            </Button>
          </div>
        )}
      </Card>

      {/* Selected Product Restock Form (Method A & B confirmation) */}
      {product && (
        <Card className="mb-4" style={{ border: '2px solid #86efac', background: '#f8fafc' }}>
          <form onSubmit={handleRestockSubmit}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
              <ProductThumb product={product} size={100} showLabel />
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: 22, fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{product.name}</h2>
                  <Button type="button" variant="icon" onClick={clear} title={t('nav.cancel', 'Cancel')}>
                    <X size={20} />
                  </Button>
                </div>
                <div className="flex gap-4 mt-2 text-sm">
                  <span>{lang === 'hi' ? 'बारकोड' : 'Barcode'}: <strong className="mono">{product.barcode || product.code || '—'}</strong></span>
                  <span>{lang === 'hi' ? 'MRP' : 'MRP'}: <strong>{money(product.mrp)}</strong></span>
                  <span>{lang === 'hi' ? 'खरीद दर' : 'Cost'}: <strong>{money(product.purRate || product.cost)}</strong></span>
                </div>

                {/* Stock Counter Preview */}
                <div className="p-3 mt-3 rounded-lg flex items-center justify-between" style={{ background: '#e0f2fe', border: '1px solid #bae6fd' }}>
                  <div>
                    <span className="text-xs text-sky-800 block font-semibold">{t('restock.current_stock', 'दुकान में अभी उपलब्ध स्टॉक')}</span>
                    <strong className="text-2xl text-sky-950">{previousStock} {product.unit || ''}</strong>
                  </div>
                  <ArrowRight size={24} style={{ color: '#0284c7' }} />
                  <div>
                    <span className="text-xs text-emerald-800 block font-semibold">{lang === 'hi' ? 'नया कुल स्टॉक हो जाएगा' : 'Updated Stock After Save'}</span>
                    <strong className="text-2xl text-emerald-700">{updatedStock} {product.unit || ''}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <FormField label={t('restock.new_stock_arrived', 'नया कितना सामान आया? (मात्रा)')} required>
                <Input
                  ref={receivedInputRef}
                  required
                  type="number"
                  step="any"
                  min="0.001"
                  value={form.receivedQuantity}
                  onChange={(e) => setForm({ ...form, receivedQuantity: e.target.value })}
                  placeholder="उदा. 50"
                  style={{ fontSize: 18, fontWeight: 'bold' }}
                />
              </FormField>

              <FormField label={t('restock.purchase_rate', 'खरीदने की कीमत (वैकल्पिक ₹)')}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.purchaseRate}
                  onChange={(e) => setForm({ ...form, purchaseRate: e.target.value })}
                  placeholder={String(product.purRate || '')}
                />
              </FormField>

              <FormField label={t('restock.supplier_name', 'सप्लायर या कंपनी का नाम')}>
                <Input
                  list="restock-suppliers"
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  placeholder="उदा. Parle, Amul"
                />
                <datalist id="restock-suppliers">
                  {suppliers.map((s, idx) => (
                    <option key={idx} value={s.name} />
                  ))}
                </datalist>
              </FormField>
            </div>

            {error && <div className="alert alert-error mt-3">{error}</div>}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <Button type="button" variant="secondary" onClick={clear}>
                {t('nav.cancel', 'Cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={saving || rec <= 0} style={{ padding: '12px 24px', fontSize: 16 }}>
                <Save size={18} style={{ marginRight: 6 }} />
                {saving ? t('ui.loading', 'Updating...') : t('restock.confirm_btn', 'स्टॉक बढ़ाएं')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Multiple Matches Chooser */}
      {choices && (
        <MatchChooser
          code={choices.code}
          matches={choices.matches}
          onSelect={select}
          onClose={() => setChoices(null)}
        />
      )}

      {/* Method C: Quick New Product Registration Modal */}
      {showNewProductModal && (
        <div className="modal-overlay" onClick={() => setShowNewProductModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateNewProductSubmit}>
              <div className="modal-head">
                <h3>{t('restock.quick_add_title', 'नया सामान सूची में जोड़ें')}</h3>
                <Button type="button" variant="ghost" onClick={() => setShowNewProductModal(false)}><X size={18} /></Button>
              </div>

              <div className="modal-body">
                <FormField label={t('restock.product_name', 'सामान का नाम')} required>
                  <Input
                    required
                    autoFocus
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    placeholder={lang === 'hi' ? 'उदा. पारले-जी बिस्कुट 250g' : 'e.g. Parle-G Biscuit 250g'}
                  />
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Barcode">
                    <Input
                      value={newProd.barcode}
                      onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                      placeholder="8901234567890"
                    />
                  </FormField>

                  <FormField label={t('restock.category', 'Category')}>
                    <select
                      className="form-select"
                      value={newProd.category}
                      onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    >
                      <option value="">{lang === 'hi' ? '-- कैटेगरी चुनें --' : '-- Select Category --'}</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label={lang === 'hi' ? 'खरीदने की कीमत (₹)' : 'Purchase Price (₹)'}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProd.cost}
                      onChange={(e) => setNewProd({ ...newProd, cost: e.target.value })}
                      placeholder="10"
                    />
                  </FormField>

                  <FormField label={t('restock.selling_price', 'बेचने की कीमत / MRP (₹)')} required>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProd.price}
                      onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                      placeholder="15"
                    />
                  </FormField>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label={t('restock.initial_stock', 'शुरुआती मात्रा (स्टॉक)')} required>
                    <Input
                      required
                      type="number"
                      min="0"
                      step="any"
                      value={newProd.stockCount}
                      onChange={(e) => setNewProd({ ...newProd, stockCount: e.target.value })}
                      placeholder="50"
                    />
                  </FormField>

                  <FormField label="GST %">
                    <select
                      className="form-select"
                      value={newProd.taxRate}
                      onChange={(e) => setNewProd({ ...newProd, taxRate: e.target.value })}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </FormField>
                </div>
              </div>

              <div className="modal-foot">
                <Button type="button" variant="secondary" onClick={() => setShowNewProductModal(false)}>
                  {t('nav.cancel', 'Cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={savingProduct}>
                  {savingProduct ? t('ui.loading', 'Saving...') : (lang === 'hi' ? 'सुरक्षित करें और स्टॉक जोड़ें' : 'Save & Restock')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock History Log */}
      <Card>
        <h3 className="section-heading mb-3">{lang === 'hi' ? 'हाल में आया सामान (इतिहास)' : 'Recent Goods Inward History'}</h3>
        {loadingHistory ? (
          <LoadingState text={t('ui.loading', 'Loading history...')} />
        ) : history.rows.length === 0 ? (
          <p className="muted-note">{lang === 'hi' ? 'अभी कोई नया सामान दर्ज नहीं हुआ है।' : 'No restock history yet.'}</p>
        ) : (
          <div className="card-table-wrapper">
            <table className="pmart-table is-dense">
              <thead>
                <tr>
                  <th>{t('ui.date', 'Date')}</th>
                  <th>{t('billing.item', 'Product')}</th>
                  <th className="num">{lang === 'hi' ? 'आई मात्रा' : 'Qty Added'}</th>
                  <th className="num">{lang === 'hi' ? 'खरीद दर' : 'Cost Rate'}</th>
                  <th>{t('restock.supplier_name', 'Supplier')}</th>
                  <th>{lang === 'hi' ? 'कर्मचारी' : 'Staff'}</th>
                </tr>
              </thead>
              <tbody>
                {history.rows.map((r) => (
                  <tr key={r._id}>
                    <td>{dateTime(r.createdAt)}</td>
                    <td>
                      <strong>{r.productName}</strong>
                      <span className="cell-sub mono">{r.barcode || r.productCode}</span>
                    </td>
                    <td className="num font-bold text-emerald-600">+{r.receivedQuantity}</td>
                    <td className="num">{r.purchaseRate ? money(r.purchaseRate) : '—'}</td>
                    <td>{r.supplierName || '—'}</td>
                    <td>{r.user?.name || 'Staff'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.pagination.pages > 1 && (
              <Pagination
                page={historyPage}
                pages={history.pagination.pages}
                total={history.pagination.total}
                onPageChange={setHistoryPage}
              />
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
