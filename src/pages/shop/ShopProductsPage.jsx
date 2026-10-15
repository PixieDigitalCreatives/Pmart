import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '@/services/productService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { BulkProductUploadModal } from '@/components/shop/BulkProductUploadModal';
import { useToast } from '@/context/ToastContext';
import { Package, Plus, Search, Edit, Eye, EyeOff, Upload, Trash2, PackageX } from 'lucide-react';
import { PageHeader, Button, StatusBadge, Input, Select, LoadingState, EmptyState } from '@/components/ui';
import './ShopProductsPage.scss';
import { plural } from '@/utils/plural';

/** Product catalog management. Store owners see their own store; catalog staff see every store. */
export const ShopProductsPage = ({ basePath = '/shop/products' }) => {
  const { role } = useAuth();
  const toast = useToast();
  const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ products: [], totalCount: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
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
          search: query || undefined,
          status: status === 'all' ? undefined : status,
          lowStock: lowStock ? 'true' : undefined,
          page,
          limit: 50
        })
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load products.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, lowStock, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

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
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.products.map((p) => p._id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleActive = async (p) => {
    try {
      await productService.setProductActive(p._id, !p.isActive);
      toast.success(`${p.name} is now ${p.isActive ? 'hidden from' : 'visible in'} the store.`);
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

  const handleBulkVisibility = async (isActive) => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const res = await productService.bulkUpdateProducts(Array.from(selectedIds), { isActive });
      const count = res.updatedCount;
      toast.success(
        isActive
          ? `Made ${count} product${count !== 1 ? 's' : ''} visible in store.`
          : `Hidden ${count} product${count !== 1 ? 's' : ''} from store.`
      );
      setSelectedIds(new Set());
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update products status.'));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkOutOfStock = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const res = await productService.bulkUpdateProducts(Array.from(selectedIds), { stockCount: 0 });
      const count = res.updatedCount;
      toast.success(`Marked ${count} product${count !== 1 ? 's' : ''} as out of stock.`);
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
      const res = await productService.bulkDeleteProducts(Array.from(selectedIds), true);
      const total = res.deletedCount || 0;
      toast.success(`Successfully removed ${total} product${total !== 1 ? 's' : ''}.`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete products.'));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="shop-products-page">
      <PageHeader
        title="Products"
        subtitle={isStaff ? 'All stores' : 'Your store catalog'}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button type="button" variant="outline" onClick={() => setShowBulkUpload(true)}>
              <Upload size={16} style={{ marginRight: 8 }} />
              Bulk upload
            </Button>
            <Button component={Link} to={`${basePath}/new`} variant="primary">
              <Plus size={16} style={{ marginRight: 8 }} />
              Add product
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div style={{ minWidth: 260, flex: 1 }}>
          <Input icon={Search} placeholder="Search name, brand or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: 160 }}>
          <option value="all">All statuses</option>
          <option value="active">Visible</option>
          <option value="inactive">Hidden / archived</option>
        </Select>
        <label htmlFor="low-stock-filter" className="flex items-center gap-2 text-sm">
          <input id="low-stock-filter" type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} />
          Low stock only
        </label>
        <span className="muted-note">{plural(data.totalCount, 'product')}</span>
      </div>

      {/* Bulk selection bar */}
      {selectedIds.size > 0 && (
        <div className="bulk-selection-bar">
          <div className="selection-count">
            <span className="count-badge">{selectedIds.size}</span>
            <span>product{selectedIds.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="selection-actions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBulkUpdating || isBulkDeleting}
              onClick={() => handleBulkVisibility(true)}
              className="bulk-btn bulk-btn-visible"
              title="Make selected products visible in store"
            >
              <Eye size={14} style={{ marginRight: 6 }} />
              Make visible
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBulkUpdating || isBulkDeleting}
              onClick={() => handleBulkVisibility(false)}
              className="bulk-btn bulk-btn-hide"
              title="Hide selected products from store"
            >
              <EyeOff size={14} style={{ marginRight: 6 }} />
              Hide
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBulkUpdating || isBulkDeleting}
              onClick={() => setShowBulkOutOfStockConfirm(true)}
              className="bulk-btn bulk-btn-stock"
              title="Set stock count to 0 for selected products"
            >
              <PackageX size={14} style={{ marginRight: 6 }} />
              Mark out of stock
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isBulkUpdating || isBulkDeleting}
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="delete-selected-btn"
              title="Permanently remove selected products"
            >
              <Trash2 size={14} style={{ marginRight: 6 }} />
              Delete selected
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBulkUpdating || isBulkDeleting}
              onClick={clearSelection}
              className="clear-sel-btn"
              title="Clear selection"
            >
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
          title={query || status !== 'all' || lowStock ? 'No products match' : 'No products yet'}
          description={query || status !== 'all' || lowStock ? 'Try different filters.' : 'Add your first product to start selling.'}
          action={!query && <Button component={Link} to={`${basePath}/new`} variant="primary">Add product</Button>}
        />
      ) : (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="product-checkbox"
                    checked={data.products.length > 0 && data.products.every((p) => selectedIds.has(p._id))}
                    onChange={toggleSelectAll}
                    aria-label="Select all products on this page"
                  />
                </th>
                <th>Product</th>
                <th>Category</th>
                {isStaff && <th>Store</th>}
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p._id} className={selectedIds.has(p._id) ? 'row-selected' : ''}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="product-checkbox"
                      checked={selectedIds.has(p._id)}
                      onChange={() => toggleSelect(p._id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} /> : <Package size={20} className="text-gray-400" />}
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="muted-note">
                          {p.unit}
                          {p.sku ? ` • SKU ${p.sku}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{p.category?.name || '—'}</td>
                  {isStaff && <td>{p.shop?.name || '—'}</td>}
                  <td>
                    <div className="font-semibold">₹{p.price}</div>
                    {p.mrp > p.price && <div className="muted-note">MRP ₹{p.mrp}</div>}
                  </td>
                  <td>
                    <StatusBadge status={String(p.stockCount)} type={p.stockCount === 0 ? 'error' : p.stockCount <= 10 ? 'warning' : 'neutral'} />
                  </td>
                  <td>
                    <StatusBadge status={p.isActive ? 'Visible' : 'Hidden'} type={p.isActive ? 'success' : 'neutral'} />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <Button component={Link} to={`${basePath}/${p._id}`} variant="secondary" size="sm" title="Edit" aria-label={`Edit ${p.name}`}>
                      <Edit size={14} />
                    </Button>{' '}
                    <Button variant="secondary" size="sm" onClick={() => toggleActive(p)} title={p.isActive ? 'Hide from store' : 'Show in store'} aria-label={p.isActive ? `Hide ${p.name}` : `Show ${p.name}`}>
                      {p.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>{' '}
                    <Button variant="secondary" size="sm" onClick={() => setToDelete(p)} title="Delete product" aria-label={`Delete ${p.name}`} className="delete-action">
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="actions-row mt-4" style={{ justifyContent: 'flex-end' }}>
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="muted-note">
            Page {page} of {data.totalPages}
          </span>
          <Button size="sm" variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(toDelete)}
        onClose={() => !deleting && setToDelete(null)}
        onConfirm={handleDeleteSingle}
        title="Delete product"
        message={toDelete ? `Are you sure you want to delete "${toDelete.name}"? This action cannot be undone.` : ''}
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
        message={`Are you sure you want to set the stock to 0 for ${selectedIds.size} selected product${selectedIds.size > 1 ? 's' : ''}? Customers will no longer be able to add them to their cart.`}
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

      <BulkProductUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={() => {
          load();
        }}
        isStaff={isStaff}
      />
    </div>
  );
};
