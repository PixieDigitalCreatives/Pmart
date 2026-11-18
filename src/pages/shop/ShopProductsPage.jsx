import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { productService } from '@/services/productService';
import { inventoryService } from '@/services/inventoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { BulkProductUploadModal } from '@/components/shop/BulkProductUploadModal';
import { useToast } from '@/context/ToastContext';
import { TbPackage as Package, TbPlus as Plus, TbSearch as Search, TbEdit as Edit, TbEye as Eye, TbEyeOff as EyeOff, TbUpload as Upload, TbTrash as Trash2, TbPackageOff as PackageX, TbFileDownload as FileDown, TbFileUpload as FileUp } from 'react-icons/tb';
import { PageHeader, Button, StatusBadge, Input, Select, LoadingState, EmptyState } from '@/components/ui';
import { ScannerInput } from '@/components/inventory/ScannerInput';
import { MatchChooser } from '@/components/inventory/ProductSearch';
import { ProductThumb, ImageStatusBadge, StockBadge } from '@/components/inventory/ProductThumb';
import { Pagination, SortTh } from '@/components/inventory/Pagination';
import { money } from '@/utils/format';
import '@/components/inventory/inventory.scss';
import './ShopProductsPage.scss';
import { plural } from '@/utils/plural';

const FIELDS = [
  ['all', 'All fields'],
  ['name', 'Name'],
  ['code', 'Product code'],
  ['barcode', 'Barcode'],
  ['company', 'Company'],
  ['manufacturer', 'Manufacturer']
];

/** Product and inventory list. Store owners see their own store; staff see every store. */
export const ShopProductsPage = ({ basePath = '/shop/products' }) => {
  const { role, can } = useAuth();
  const { t, lang } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';
  const isOwner = role === 'SHOP_OWNER';
  const canEdit = isOwner || can('catalog.manage');
  const canDelete = isOwner || can('catalog.delete');
  const canAdjust = isOwner || can('inventory.adjust');

  const f = {
    search: params.get('search') || '',
    field: params.get('field') || 'all',
    stock: params.get('stock') || '',
    online: params.get('online') || '',
    image: params.get('image') || '',
    sort: params.get('sort') || 'name',
    page: Number(params.get('page')) || 1
  };
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const [search, setSearch] = useState(f.search);
  const [data, setData] = useState({ products: [], totalCount: 0, totalPages: 0, lowStockThreshold: 10 });
  const [loading, setLoading] = useState(true);
  const [looking, setLooking] = useState(false);
  const [choices, setChoices] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkOutOfStockConfirm, setShowBulkOutOfStockConfirm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(
        await productService.getManagedProducts({
          search: f.search || undefined,
          field: f.field === 'all' ? undefined : f.field,
          stock: f.stock || undefined,
          online: f.online || undefined,
          image: f.image || undefined,
          sort: f.sort,
          page: f.page,
          limit: 50
        })
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load products.'));
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
      if (search.trim() !== f.search) setFilter('search', search.trim());
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onScan = async (code) => {
    setLooking(true);
    try {
      const { matches } = await inventoryService.lookup(code);
      if (matches.length === 1) navigate(`${basePath}/${matches[0]._id}`);
      else if (matches.length > 1) setChoices({ code, matches });
      else if (canEdit) {
        toast.info(`No product has ${code}. Add it now.`);
        navigate(`${basePath}/new?barcode=${encodeURIComponent(code)}`);
      } else toast.error(`No product has the barcode or code ${code}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Lookup failed.'));
    } finally {
      setLooking(false);
    }
  };

  // A scan on another admin screen arrives as ?scan=<code> (see AdminLayout); handle it once, then drop it from the URL.
  const pendingScan = params.get('scan');
  const handledScan = useRef('');
  useEffect(() => {
    if (!pendingScan || handledScan.current === pendingScan) return;
    handledScan.current = pendingScan;
    setFilter('scan', '');
    onScan(pendingScan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScan]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (data.products.length === 0) return;
    const allSelected = data.products.every((p) => selectedIds.has(p._id));
    setSelectedIds(allSelected ? new Set() : new Set(data.products.map((p) => p._id)));
  };

  const toggleActive = async (p) => {
    try {
      await productService.setProductActive(p._id, !p.isActive);
      toast.success(`${p.name} is now ${p.isActive ? 'hidden from' : 'listed on'} the storefront.`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const handleDeleteSingle = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await productService.deleteProduct(toDelete._id, true);
      toast.success(res.message || `"${toDelete.name}" deleted.`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(toDelete._id);
        return next;
      });
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete product.'));
    } finally {
      setDeleting(false);
    }
  };

  const reportBulk = (res, verb) => {
    const failed = res.failedCount || 0;
    if (res.updatedCount || res.deletedCount) toast.success(`${verb} ${plural(res.updatedCount ?? res.deletedCount, 'product')}.`);
    if (failed) toast.error(`${plural(failed, 'product')} could not be changed: ${res.errors[0]?.message || ''}`);
  };

  const handleBulkVisibility = async (isActive) => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      reportBulk(await productService.bulkUpdateProducts(Array.from(selectedIds), { isActive }), isActive ? 'Listed online' : 'Hid');
      setSelectedIds(new Set());
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update products.'));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkOutOfStock = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      reportBulk(await productService.bulkUpdateProducts(Array.from(selectedIds), { stockCount: 0 }), 'Set to zero stock:');
      setSelectedIds(new Set());
      setShowBulkOutOfStockConfirm(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not mark products out of stock.'));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      reportBulk(await productService.bulkDeleteProducts(Array.from(selectedIds), true), 'Deleted');
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete products.'));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const filtered = f.search || f.stock || f.online || f.image;

  return (
    <div className="shop-products-page">
      <PageHeader
        title="Products"
        subtitle={isStaff ? 'Inventory across all stores' : 'Your store catalog'}
        action={
          <div className="actions-row">
            {isStaff && can('catalog.import') && (
              <Button component={Link} to="/admin/inventory/import" variant="secondary">
                <FileUp size={16} style={{ marginRight: 8 }} />
                Import CSV
              </Button>
            )}
            {isStaff && can('inventory.read') && (
              <Button variant="secondary" onClick={() => inventoryService.exportCsv().catch((err) => toast.error(apiErrorMessage(err)))}>
                <FileDown size={16} style={{ marginRight: 8 }} />
                Export CSV
              </Button>
            )}
            {canEdit && (
              <Button type="button" variant="secondary" onClick={() => setShowBulkUpload(true)}>
                <Upload size={16} style={{ marginRight: 8 }} />
                Bulk upload
              </Button>
            )}
            {canEdit && (
              <Button component={Link} to={`${basePath}/new`} variant="primary">
                <Plus size={16} style={{ marginRight: 8 }} />
                Add product
              </Button>
            )}
          </div>
        }
      />

      {isStaff && (
        <div className="mb-3">
          <ScannerInput onScan={onScan} busy={looking} autoFocus={false} placeholder="Scan a barcode to open the product (unknown barcodes open Add product)" />
        </div>
      )}

      {/* Quick Stock Status Filter Pills (Requirement 7) */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-sm font-bold text-slate-600 mr-1">{t('nav.stock', 'Stock')}:</span>
        <button
          type="button"
          className={`btn btn-sm ${f.stock === '' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('stock', '')}
        >
          {t('stock.all', 'सभी सामान')}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${f.stock === 'in' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ color: f.stock === 'in' ? undefined : '#15803d' }}
          onClick={() => setFilter('stock', 'in')}
        >
          🟢 {t('stock.sufficient', 'पर्याप्त सामान')}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${f.stock === 'low' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ color: f.stock === 'low' ? undefined : '#b45309' }}
          onClick={() => setFilter('stock', 'low')}
        >
          🟡 {t('stock.low', 'सामान कम है')}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${f.stock === 'out' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ color: f.stock === 'out' ? undefined : '#b91c1c' }}
          onClick={() => setFilter('stock', 'out')}
        >
          🔴 {t('stock.out', 'सामान खत्म है')}
        </button>
      </div>

      <div className="toolbar">
        <div className="toolbar-grow">
          <Input icon={Search} placeholder="Search name, code, barcode, company…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
        </div>
        <Select value={f.field} onChange={(e) => setFilter('field', e.target.value === 'all' ? '' : e.target.value)} aria-label="Search in" style={{ width: 150 }}>
          {FIELDS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={f.stock} onChange={(e) => setFilter('stock', e.target.value)} aria-label="Stock" style={{ width: 150 }}>
          <option value="">Any stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </Select>
        <Select value={f.online} onChange={(e) => setFilter('online', e.target.value)} aria-label="Storefront" style={{ width: 160 }}>
          <option value="">Online and hidden</option>
          <option value="listed">Listed online</option>
          <option value="hidden">Not listed online</option>
        </Select>
        {isStaff && (
          <Select value={f.image} onChange={(e) => setFilter('image', e.target.value)} aria-label="Image" style={{ width: 170 }}>
            <option value="">Any image status</option>
            <option value="VERIFIED">Verified photo</option>
            <option value="PENDING">Pending verification</option>
            <option value="NOT_AVAILABLE">No image</option>
          </Select>
        )}
        <span className="muted-note">{plural(data.totalCount, 'product')}</span>
      </div>

      {selectedIds.size > 0 && canEdit && (
        <div className="bulk-selection-bar">
          <div className="selection-count">
            <span className="count-badge">{selectedIds.size}</span>
            <span>product{selectedIds.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="selection-actions">
            <Button type="button" variant="outline" size="sm" disabled={isBulkUpdating || isBulkDeleting} onClick={() => handleBulkVisibility(true)} className="bulk-btn bulk-btn-visible" title="List the selected products on the storefront (they need a category)">
              <Eye size={14} style={{ marginRight: 6 }} />
              List online
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isBulkUpdating || isBulkDeleting} onClick={() => handleBulkVisibility(false)} className="bulk-btn bulk-btn-hide" title="Hide the selected products from the storefront">
              <EyeOff size={14} style={{ marginRight: 6 }} />
              Hide
            </Button>
            {canAdjust && (
              <Button type="button" variant="outline" size="sm" disabled={isBulkUpdating || isBulkDeleting} onClick={() => setShowBulkOutOfStockConfirm(true)} className="bulk-btn bulk-btn-stock" title="Set stock to 0 (recorded as a stock adjustment)">
                <PackageX size={14} style={{ marginRight: 6 }} />
                Mark out of stock
              </Button>
            )}
            {canDelete && (
              <Button type="button" variant="danger" size="sm" disabled={isBulkUpdating || isBulkDeleting} onClick={() => setShowBulkDeleteConfirm(true)} className="delete-selected-btn" title="Permanently remove selected products">
                <Trash2 size={14} style={{ marginRight: 6 }} />
                Delete selected
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" disabled={isBulkUpdating || isBulkDeleting} onClick={() => setSelectedIds(new Set())} className="clear-sel-btn" title="Clear selection">
              Clear
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState text="Loading products..." />
      ) : data.products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={filtered ? 'No products match' : 'No products yet'}
          description={filtered ? 'Try different filters.' : 'Add a product, scan a barcode or import the inventory CSV.'}
          action={!filtered && canEdit && <Button component={Link} to={`${basePath}/new`} variant="primary">Add product</Button>}
        />
      ) : (
        <div className="pmart-table-wrapper overflow-x-auto">
          <table className="pmart-table is-dense">
            <thead>
              <tr>
                {canEdit && (
                  <th style={{ width: 44, textAlign: 'center' }}>
                    <input type="checkbox" className="product-checkbox" checked={data.products.length > 0 && data.products.every((p) => selectedIds.has(p._id))} onChange={toggleSelectAll} aria-label="Select all products on this page" />
                  </th>
                )}
                <SortTh field="name" sort={f.sort} onSort={(s) => setFilter('sort', s)}>
                  Product
                </SortTh>
                <SortTh field="code" sort={f.sort} onSort={(s) => setFilter('sort', s)}>
                  Code / barcode
                </SortTh>
                <th>Company / rack</th>
                {isStaff && <th>Store</th>}
                <SortTh field="price" sort={f.sort} onSort={(s) => setFilter('sort', s)} align="right">
                  Price
                </SortTh>
                <th className="num">Pur. rate</th>
                <SortTh field="stock" sort={f.sort} onSort={(s) => setFilter('sort', s)} align="right">
                  Stock
                </SortTh>
                {isStaff && <th>Image</th>}
                <th>Online</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p._id} className={selectedIds.has(p._id) ? 'row-selected' : ''}>
                  {canEdit && (
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" className="product-checkbox" checked={selectedIds.has(p._id)} onChange={() => toggleSelect(p._id)} aria-label={`Select ${p.name}`} />
                    </td>
                  )}
                  <td style={{ minWidth: 220 }}>
                    <div className="flex items-center gap-2">
                      <ProductThumb product={p} size={40} />
                      <div>
                        <Link to={`${basePath}/${p._id}`} className="font-semibold">
                          {p.name}
                        </Link>
                        <span className="cell-sub">
                          {p.unit}
                          {p.category?.name ? ` · ${p.category.name}` : ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="mono">{p.code || '—'}</span>
                    <span className="cell-sub mono">{p.barcode || 'no barcode'}</span>
                  </td>
                  <td>
                    {p.company || '—'}
                    {p.rackNo && <span className="cell-sub">Rack {p.rackNo}</span>}
                  </td>
                  {isStaff && <td>{p.shop?.name || '—'}</td>}
                  <td className="num">
                    <div className="font-semibold">{money(p.price)}</div>
                    {p.mrp > 0 && <span className="cell-sub">MRP {money(p.mrp)}</span>}
                  </td>
                  <td className="num">{money(p.purRate)}</td>
                  <td className="num">
                    <StockBadge stock={p.stockCount} threshold={data.lowStockThreshold} />
                  </td>
                  {isStaff && (
                    <td>
                      <ImageStatusBadge status={p.image?.status} />
                    </td>
                  )}
                  <td>
                    <StatusBadge status={p.isActive ? 'Listed' : 'Hidden'} type={p.isActive ? 'success' : 'neutral'} />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <Button component={Link} to={`${basePath}/${p._id}`} variant="secondary" size="sm" title={canEdit ? 'Edit' : 'View'} aria-label={`${canEdit ? 'Edit' : 'View'} ${p.name}`}>
                      <Edit size={14} />
                    </Button>{' '}
                    {canEdit && (
                      <Button variant="secondary" size="sm" onClick={() => toggleActive(p)} title={p.isActive ? 'Hide from storefront' : 'List on storefront'} aria-label={p.isActive ? `Hide ${p.name}` : `List ${p.name}`}>
                        {p.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                    )}{' '}
                    {canDelete && (
                      <Button variant="secondary" size="sm" onClick={() => setToDelete(p)} title="Delete product" aria-label={`Delete ${p.name}`} className="delete-action">
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={data.page || f.page} pages={data.totalPages} total={data.totalCount} onChange={(p) => setFilter('page', String(p))} />

      <ConfirmationModal
        isOpen={Boolean(toDelete)}
        onClose={() => !deleting && setToDelete(null)}
        onConfirm={handleDeleteSingle}
        title="Delete product"
        message={toDelete ? `Are you sure you want to delete "${toDelete.name}"? Invoices and the stock ledger keep their own record of it. This cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />

      <ConfirmationModal
        isOpen={showBulkOutOfStockConfirm}
        onClose={() => !isBulkUpdating && setShowBulkOutOfStockConfirm(false)}
        onConfirm={handleBulkOutOfStock}
        title={`Mark ${selectedIds.size} product${selectedIds.size > 1 ? 's' : ''} out of stock`}
        message={`Stock will be set to 0 for ${selectedIds.size} selected product${selectedIds.size > 1 ? 's' : ''}, recorded as a stock adjustment.`}
        confirmText="Mark out of stock"
        cancelText="Cancel"
        variant="warning"
        loading={isBulkUpdating}
      />

      <ConfirmationModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => !isBulkDeleting && setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} products`}
        message={`Are you sure you want to delete the ${selectedIds.size} selected products? This action cannot be undone.`}
        confirmText={`Delete ${selectedIds.size} products`}
        cancelText="Cancel"
        variant="danger"
        loading={isBulkDeleting}
      />

      <BulkProductUploadModal isOpen={showBulkUpload} onClose={() => setShowBulkUpload(false)} onSuccess={load} isStaff={isStaff} />
      <MatchChooser matches={choices?.matches} code={choices?.code} onPick={(p) => navigate(`${basePath}/${p._id}`)} onClose={() => setChoices(null)} />
    </div>
  );
};
