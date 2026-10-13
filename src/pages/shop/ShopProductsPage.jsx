import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '@/services/productService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useToast } from '@/context/ToastContext';
import { Package, Plus, Search, Edit, Archive, Eye, EyeOff } from 'lucide-react';
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
  const [toArchive, setToArchive] = useState(null);
  const [archiving, setArchiving] = useState(false);

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

  const toggleActive = async (p) => {
    try {
      await productService.setProductActive(p._id, !p.isActive);
      toast.success(`${p.name} is now ${p.isActive ? 'hidden from' : 'visible in'} the store.`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const archive = async () => {
    setArchiving(true);
    try {
      await productService.archiveProduct(toArchive._id);
      toast.success(`${toArchive.name} archived.`);
      setToArchive(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="shop-products-page">
      <PageHeader
        title="Products"
        subtitle={isStaff ? 'All stores' : 'Your store catalog'}
        action={
          <Button component={Link} to={`${basePath}/new`} variant="primary">
            <Plus size={16} style={{ marginRight: 8 }} />
            Add product
          </Button>
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
                <tr key={p._id}>
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
                    {p.isActive && (
                      <Button variant="secondary" size="sm" onClick={() => setToArchive(p)} title="Archive" aria-label={`Archive ${p.name}`}>
                        <Archive size={14} />
                      </Button>
                    )}
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
        isOpen={Boolean(toArchive)}
        onClose={() => !archiving && setToArchive(null)}
        onConfirm={archive}
        title="Archive product"
        message={toArchive ? `Archive "${toArchive.name}"? It will be hidden from the store. Past orders keep their record.` : ''}
        confirmText="Archive"
        cancelText="Cancel"
        variant="danger"
        loading={archiving}
      />
    </div>
  );
};
