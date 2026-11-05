import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { shopService } from '@/services/shopService';
import { inventoryService } from '@/services/inventoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { TbChevronLeft as ChevronLeft, TbDeviceFloppy as Save, TbAlertTriangle as AlertTriangle, TbSearch as Search, TbUpload as Upload, TbHistory as History, TbExternalLink as ExternalLink } from 'react-icons/tb';
import { Input, Button, Select, Card, FormField, PageHeader, LoadingState } from '@/components/ui';
import { ProductThumb, ImageStatusBadge } from '@/components/inventory/ProductThumb';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { prepareImage } from '@/utils/imageFile';
import { money, qty } from '@/utils/format';
import '@/components/inventory/inventory.scss';

// Tags that place a product in a home-page section (see HomePage TAG_SECTIONS).
const HOME_TAGS = [
  { tag: 'daily-essentials', label: 'Daily Essentials' },
  { tag: 'fresh-picks', label: 'Fresh Picks' },
  { tag: 'best-deals', label: 'Best Deals' },
  { tag: 'under-99', label: 'Under ₹99' }
];

// The 17 inventory CSV columns, in file order (see backend modules/inventory/csv-fields.js).
const CSV_COLUMNS = ['code', 'name', 'unit', 'stock', 'deal', 'free', 'pur_deal', 'pur_free', 'cost', 'value', 'mrp', 'pur_rate', 'rate', 'company', 'manufact', 'rackno', 'barcode'];
const NUMBER_FIELDS = ['deal', 'free', 'purDeal', 'purFree', 'cost', 'purRate', 'rate', 'mrp'];

const EMPTY = {
  code: '',
  name: '',
  unit: '',
  stockCount: '',
  deal: '',
  free: '',
  purDeal: '',
  purFree: '',
  cost: '',
  mrp: '',
  purRate: '',
  rate: '',
  company: '',
  manufacturer: '',
  rackNo: '',
  barcode: '',
  extraBarcodes: '',
  taxRate: '',
  hsn: '',
  category: '',
  subcategory: '',
  shop: '',
  brand: '',
  sku: '',
  description: '',
  tags: [],
  extraTags: '',
  specifications: '',
  nutrition: '',
  isActive: false
};

/** "Key: value" lines <-> { key: value } */
const linesToMap = (text) =>
  Object.fromEntries(
    text
      .split('\n')
      .map((l) => l.split(':'))
      .filter((p) => p.length >= 2 && p[0].trim() && p.slice(1).join(':').trim())
      .map((p) => [p[0].trim(), p.slice(1).join(':').trim()])
  );
const mapToLines = (obj) => Object.entries(obj || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
const str = (v) => (v === undefined || v === null ? '' : String(v));

export const ShopProductNewPage = ({ basePath = '/shop/products' }) => {
  const { id } = useParams();
  const [query] = useSearchParams();
  const isEdit = Boolean(id) && id !== 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const { role, can } = useAuth();
  const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';
  const canEdit = role === 'SHOP_OWNER' || can('catalog.manage');
  const readOnly = !canEdit;

  const [form, setForm] = useState(EMPTY);
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [barcodeUsers, setBarcodeUsers] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [external, setExternal] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [prefillChecked, setPrefillChecked] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [cats, shopList, p] = await Promise.all([
          categoryService.getManagedCategories().catch(() => []),
          isStaff ? shopService.getPublicShops() : Promise.resolve([]),
          isEdit ? productService.getManagedProduct(id) : Promise.resolve(null)
        ]);
        if (cancelled) return;
        setCategories(cats.filter((c) => c.isActive || (p && String(c._id) === String(p.category?._id))));
        setShops(shopList);
        if (p) {
          const homeTags = HOME_TAGS.map((t) => t.tag);
          setProduct(p);
          setForm({
            ...EMPTY,
            ...Object.fromEntries(['code', 'name', 'unit', 'company', 'manufacturer', 'rackNo', 'barcode', 'hsn', 'brand', 'sku', 'subcategory', 'description'].map((k) => [k, str(p[k])])),
            ...Object.fromEntries(NUMBER_FIELDS.map((k) => [k, str(p[k])])),
            rate: str(p.rate ?? p.price),
            stockCount: str(p.stockCount),
            extraBarcodes: (p.barcodes || []).filter((b) => b !== p.barcode).join('\n'),
            taxRate: str(p.taxRate),
            category: p.category?._id || '',
            shop: p.shop?._id || '',
            tags: (p.tags || []).filter((t) => homeTags.includes(t)),
            extraTags: (p.tags || []).filter((t) => !homeTags.includes(t)).join(', '),
            specifications: mapToLines(p.specifications),
            nutrition: mapToLines(p.nutrition),
            isActive: p.isActive
          });
        } else {
          setForm((f) => ({ ...f, barcode: query.get('barcode') || '', shop: shopList.length === 1 ? shopList[0]._id : '' }));
        }
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not load the product form.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, isStaff, query]);

  // Duplicate barcode warning.
  useEffect(() => {
    const code = form.barcode.trim();
    if (!isStaff || code.length < 3) {
      setBarcodeUsers([]);
      return undefined;
    }
    const t = setTimeout(() => inventoryService.barcodeCheck(code, isEdit ? id : undefined).then(setBarcodeUsers).catch(() => setBarcodeUsers([])), 300);
    return () => clearTimeout(t);
  }, [form.barcode, isStaff, isEdit, id]);

  // "Search existing products before creating": similar names while adding a new product.
  useEffect(() => {
    const name = form.name.trim();
    if (isEdit || name.length < 3) {
      setSimilar([]);
      return undefined;
    }
    const t = setTimeout(() => productService.getManagedProducts({ search: name, field: 'name', limit: 5 }).then((d) => setSimilar(d.products)).catch(() => setSimilar([])), 350);
    return () => clearTimeout(t);
  }, [form.name, isEdit]);

  // A barcode scanned anywhere on the page fills the barcode field.
  useBarcodeScanner((code) => setForm((f) => ({ ...f, barcode: code })), { enabled: canEdit && !loading });

  const lookupExternal = async () => {
    setLookingUp(true);
    setExternal(null);
    try {
      setExternal(await inventoryService.externalLookup(form.barcode.trim()));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Lookup failed.'));
    } finally {
      setLookingUp(false);
    }
  };

  useEffect(() => {
    if (!isEdit && query.get('barcode') && can('catalog.manage')) lookupExternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingState text="Loading..." />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const toggleTag = (tag) => setForm({ ...form, tags: form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag] });
  const selectedCategory = categories.find((c) => String(c._id) === String(form.category));
  const rateNum = Number(form.rate) || 0;
  const mrpNum = Number(form.mrp) || 0;
  const effectivePrice = rateNum > 0 ? rateNum : mrpNum;
  const stockNum = isEdit ? product.stockCount : Number(form.stockCount) || 0;
  const stockValue = Math.round(Math.max(stockNum, 0) * (Number(form.cost) || 0) * 100) / 100;
  const found = external?.results?.find((r) => r.name || r.imageUrl);

  const applyExternal = () => {
    setForm((f) => ({ ...f, name: f.name || [found.brand, found.name].filter(Boolean).join(' ').slice(0, 150), brand: f.brand || found.brand.slice(0, 80), unit: f.unit || found.quantity.slice(0, 40) }));
    setPrefilled(true);
    setPrefillChecked(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Product name is required.');
    for (const k of NUMBER_FIELDS) {
      if (form[k] !== '' && (!Number.isFinite(Number(form[k])) || Number(form[k]) < 0)) return setError(`${k} must be a number of 0 or more.`);
    }
    if (!isEdit && form.stockCount !== '' && (!Number.isFinite(Number(form.stockCount)) || Number(form.stockCount) < 0)) return setError('Opening stock must be 0 or more.');
    if (form.taxRate !== '' && (!(Number(form.taxRate) >= 0) || Number(form.taxRate) > 100)) return setError('Tax rate must be between 0 and 100.');
    if (form.isActive && !form.category) return setError('Choose a category before listing the product online.');
    if (isStaff && !form.shop) return setError('Choose the store that sells this product.');
    if (prefilled && !prefillChecked) return setError('Confirm that you have checked the details taken from the product database.');

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      unit: form.unit.trim(),
      company: form.company.trim(),
      manufacturer: form.manufacturer.trim(),
      rackNo: form.rackNo.trim(),
      barcode: form.barcode.trim(),
      barcodes: [form.barcode.trim(), ...form.extraBarcodes.split(/[\n,]+/).map((b) => b.trim())].filter(Boolean),
      ...Object.fromEntries(NUMBER_FIELDS.map((k) => [k, form[k] === '' ? 0 : Number(form[k])])),
      taxRate: form.taxRate === '' ? null : Number(form.taxRate),
      hsn: form.hsn.trim(),
      category: form.category,
      subcategory: form.subcategory,
      brand: form.brand.trim(),
      sku: form.sku.trim(),
      description: form.description.trim(),
      tags: [...new Set([...form.tags, ...form.extraTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)])],
      specifications: linesToMap(form.specifications),
      nutrition: linesToMap(form.nutrition),
      isActive: form.isActive
    };
    if (!isEdit) payload.stockCount = form.stockCount === '' ? 0 : Number(form.stockCount);
    if (isStaff) payload.shop = form.shop;

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        saved = await productService.updateProduct(id, payload);
        toast.success('Product saved.');
      } else {
        saved = await productService.createProduct(payload);
        toast.success('Product added.');
        // A database image found for this barcode is kept as an unverified candidate for review.
        if (found?.imageUrl && isStaff) {
          await inventoryService.addImageUrl(saved._id, { imageUrl: found.imageUrl, sourceUrl: found.sourceUrl }).catch(() => {});
        }
      }
      navigate(isEdit ? basePath : `${basePath}/${saved._id}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the product.'));
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await prepareImage(file);
      const res = await inventoryService.uploadImage(id, { dataUrl, markVerified: can('images.verify') });
      toast.success(res.status === 'APPROVED' ? 'Photo saved and verified.' : 'Photo saved. It will show once someone verifies it.');
      setProduct(await productService.getManagedProduct(id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const field = (key, label, props = {}, hint) => (
    <FormField label={label} htmlFor={`p-${key}`} hint={hint}>
      <Input id={`p-${key}`} value={form[key]} onChange={set(key)} disabled={readOnly} {...props} />
    </FormField>
  );
  const num = (key, label, hint, step = 'any') => field(key, label, { type: 'number', min: '0', step, inputMode: 'decimal' }, hint);

  return (
    <div>
      <Link to={basePath} className="flex items-center gap-1 text-sm mb-3">
        <ChevronLeft size={16} />
        <span>Back to products</span>
      </Link>
      <PageHeader title={isEdit ? (readOnly ? form.name : 'Edit product') : 'Add product'} subtitle={readOnly ? 'View only — you do not have permission to edit products.' : undefined} />

      <form onSubmit={submit} className="max-w-4xl">
        <Card className="mb-4">
          <h3 className="section-heading mb-3">Product</h3>
          <div className="form-grid">
            {field('code', 'Product code', { maxLength: 64, className: 'mono' }, 'Unique in the store; leading zeros are kept')}
            <FormField label="Barcode" htmlFor="p-barcode" hint={canEdit ? 'Scan it with the scanner, or type it' : undefined}>
              <Input id="p-barcode" value={form.barcode} onChange={set('barcode')} disabled={readOnly} maxLength={64} className="mono" />
            </FormField>
          </div>
          {barcodeUsers.length > 0 && (
            <div className="alert alert-warning mb-3">
              <AlertTriangle size={16} />
              <span>
                This barcode is already used by{' '}
                {barcodeUsers.map((p, i) => (
                  <React.Fragment key={p._id}>
                    {i > 0 && ', '}
                    <Link to={`${basePath}/${p._id}`}>
                      {p.name} {p.code && `(${p.code})`}
                    </Link>
                  </React.Fragment>
                ))}
                . Saving is allowed (some products share barcodes) but check it is not a duplicate.
              </span>
            </div>
          )}
          {!isEdit && can('catalog.manage') && form.barcode.trim() && (
            <div className="mb-3">
              <Button size="sm" variant="secondary" onClick={lookupExternal} isLoading={lookingUp}>
                <Search size={14} style={{ marginRight: 6 }} />
                Look up this barcode in product databases
              </Button>
              {external && !found && <span className="muted-note ml-2">{external.valid ? 'Not found in Open Food / Beauty / Products Facts.' : 'Not a valid EAN/UPC barcode, so it cannot be looked up.'}</span>}
            </div>
          )}
          {found && (
            <div className="alert alert-info mb-3">
              <span>
                <strong>Unverified</strong> — {found.sourceName} lists barcode {found.barcode} as{' '}
                <strong>{[found.brand, found.name, found.quantity].filter(Boolean).join(' · ') || 'a product with no name'}</strong>.{' '}
                <a href={found.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1">
                  Source <ExternalLink size={12} />
                </a>
                {found.imageUrl && ' Its photo will be saved as a candidate for verification.'}
                <span className="block mt-2">
                  <Button size="sm" variant="secondary" onClick={applyExternal}>
                    Use these details
                  </Button>
                </span>
              </span>
            </div>
          )}
          {prefilled && (
            <label className="flex items-center gap-2 text-sm mb-3" htmlFor="p-prefill-ok">
              <input id="p-prefill-ok" type="checkbox" checked={prefillChecked} onChange={(e) => setPrefillChecked(e.target.checked)} />I have checked these details against the actual product
            </label>
          )}
          {field('name', 'Product name *', { maxLength: 150 })}
          {similar.length > 0 && (
            <div className="alert alert-warning mb-3">
              <AlertTriangle size={16} />
              <span>
                Similar products already exist:{' '}
                {similar.map((p, i) => (
                  <React.Fragment key={p._id}>
                    {i > 0 && ', '}
                    <Link to={`${basePath}/${p._id}`}>
                      {p.name} {p.code && `(${p.code})`}
                    </Link>
                  </React.Fragment>
                ))}
              </span>
            </div>
          )}
          <div className="form-grid">
            {field('unit', 'Unit', { maxLength: 40 }, 'e.g. PCS, 24PC, KG')}
            {field('company', 'Company / supplier', { maxLength: 120 })}
            {field('manufacturer', 'Manufacturer', { maxLength: 120 })}
            {field('rackNo', 'Rack number', { maxLength: 40 })}
          </div>
          <FormField label="More barcodes for this product" htmlFor="p-extra-barcodes" hint="One per line (e.g. a new pack design with a different barcode)">
            <textarea id="p-extra-barcodes" className="form-control mono" rows="2" value={form.extraBarcodes} onChange={set('extraBarcodes')} disabled={readOnly} />
          </FormField>
        </Card>

        <Card className="mb-4">
          <h3 className="section-heading mb-3">Stock and pricing</h3>
          <div className="form-grid">
            {isEdit ? (
              <FormField label="Current stock" htmlFor="p-stock" hint="Changes only through restock, invoices or a stock adjustment">
                <div className="flex items-center gap-2">
                  <Input id="p-stock" value={`${qty(product.stockCount)} ${product.unit || ''}`} disabled />
                  {isStaff && (
                    <Button component={Link} to={`/admin/inventory/ledger?product=${id}`} variant="secondary" size="sm" title="Stock history">
                      <History size={14} />
                    </Button>
                  )}
                </div>
              </FormField>
            ) : (
              num('stockCount', 'Opening stock', 'Recorded in the stock ledger')
            )}
            {num('deal', 'Deal')}
            {num('free', 'Free quantity')}
            {num('purDeal', 'Purchase deal')}
            {num('purFree', 'Purchase free quantity')}
            {num('cost', 'Cost price (₹)')}
            <FormField label="Stock value (₹)" htmlFor="p-value" hint="Stock × cost price">
              <Input id="p-value" value={money(isEdit && Number(form.cost) === product.cost ? product.stockValue : stockValue)} disabled />
            </FormField>
            {num('mrp', 'MRP (₹)', undefined, '0.01')}
            {num('purRate', 'Purchase rate (₹)', undefined, '0.01')}
            {num('rate', 'Selling rate (₹)', `Selling price: ${money(effectivePrice)}${rateNum > 0 ? '' : ' (MRP, because the selling rate is 0)'}`, '0.01')}
            {field('taxRate', 'GST / tax rate (%)', { type: 'number', min: '0', max: '100', step: '0.01' }, 'Leave empty to use the store default')}
            {field('hsn', 'HSN code', { maxLength: 16 })}
          </div>
        </Card>

        {isEdit && isStaff && (
          <Card className="mb-4">
            <h3 className="section-heading mb-3">Product image</h3>
            <div className="flex gap-4 items-start" style={{ flexWrap: 'wrap' }}>
              <ProductThumb product={product} size={120} showLabel />
              <div className="flex-1" style={{ minWidth: 240 }}>
                <ImageStatusBadge status={product.image?.status} />
                <p className="muted-note mt-2">
                  Only an exact photograph of this product and pack is used. Found images stay unverified until approved on the{' '}
                  <Link to="/admin/inventory/images">Product images</Link> page.
                </p>
                {(can('catalog.manage') || can('images.verify')) && (
                  <label className="btn btn-secondary btn-sm mt-2" htmlFor="p-photo" style={{ cursor: 'pointer' }}>
                    <Upload size={14} style={{ marginRight: 6 }} />
                    {uploading ? 'Uploading…' : product.image?.status === 'VERIFIED' ? 'Replace with a new photo' : 'Upload the actual photo'}
                    <input id="p-photo" type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploading} onChange={(e) => uploadPhoto(e.target.files?.[0])} />
                  </label>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="mb-4">
          <h3 className="section-heading mb-3">Online storefront</h3>
          <label htmlFor="p-active" className="flex items-center gap-2 mb-3">
            <input id="p-active" type="checkbox" checked={form.isActive} onChange={set('isActive')} disabled={readOnly} />
            List this product on the online storefront (needs a category)
          </label>
          <div className="form-grid">
            <FormField label={form.isActive ? 'Category *' : 'Category'} htmlFor="p-category">
              <Select id="p-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '' })} disabled={readOnly}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Sub-category" htmlFor="p-sub">
              <Select id="p-sub" value={form.subcategory} onChange={set('subcategory')} disabled={readOnly || !selectedCategory?.subcategories?.length}>
                <option value="">None</option>
                {(selectedCategory?.subcategories || []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FormField>
            {isStaff && (
              <FormField label="Store *" htmlFor="p-shop">
                <Select id="p-shop" value={form.shop} onChange={set('shop')} disabled={readOnly}>
                  <option value="">Choose a store</option>
                  {shops.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            {field('brand', 'Brand', { maxLength: 80 })}
            {field('sku', 'SKU', { maxLength: 64 }, 'Optional, unique within the store')}
          </div>
          <FormField label="Description" htmlFor="p-desc">
            <textarea id="p-desc" className="form-control" rows="3" value={form.description} onChange={set('description')} maxLength={4000} disabled={readOnly} />
          </FormField>
          <span className="text-sm font-semibold block mb-2">Show on the home page in</span>
          <div className="flex flex-wrap gap-3 mb-3">
            {HOME_TAGS.map((t) => (
              <label key={t.tag} htmlFor={`tag-${t.tag}`} className="flex items-center gap-1 text-sm">
                <input id={`tag-${t.tag}`} type="checkbox" checked={form.tags.includes(t.tag)} onChange={() => toggleTag(t.tag)} disabled={readOnly} />
                {t.label}
              </label>
            ))}
          </div>
          {field('extraTags', 'Other search tags', {}, 'Comma separated')}
          <div className="form-grid">
            <FormField label="Specifications" htmlFor="p-specs" hint="One per line, e.g. Shelf life: 6 months">
              <textarea id="p-specs" className="form-control" rows="3" value={form.specifications} onChange={set('specifications')} disabled={readOnly} />
            </FormField>
            <FormField label="Nutrition" htmlFor="p-nutrition" hint="One per line, e.g. Energy: 120 kcal">
              <textarea id="p-nutrition" className="form-control" rows="3" value={form.nutrition} onChange={set('nutrition')} disabled={readOnly} />
            </FormField>
          </div>
        </Card>

        {isEdit && product.importSource?.raw && (
          <Card className="mb-4">
            <h3 className="section-heading mb-1">Original CSV values</h3>
            <p className="muted-note mb-3">Exactly as imported (row {product.importSource.row}); kept for audit and never changed.</p>
            <div className="pmart-table-wrapper overflow-x-auto">
              <table className="pmart-table is-dense">
                <thead>
                  <tr>
                    {CSV_COLUMNS.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {CSV_COLUMNS.map((c) => (
                      <td key={c} className="mono whitespace-nowrap">
                        {product.importSource.raw[c] === '' ? <span className="text-muted">(empty)</span> : `“${product.importSource.raw[c]}”`}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
        {canEdit && (
          <div className="actions-row mb-4">
            <Button type="submit" variant="primary" isLoading={saving}>
              <Save size={16} style={{ marginRight: 6 }} />
              {isEdit ? 'Save product' : 'Add product'}
            </Button>
            <Button component={Link} to={basePath} variant="secondary">
              Cancel
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
