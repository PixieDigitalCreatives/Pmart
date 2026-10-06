import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useToast } from '@/context/ToastContext';
import { Package, Plus, Search, Edit, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import './ShopProductsPage.scss';

export const ShopProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', sku: '', price: '', category: '', stockCount: '', isActive: true });

  const toast = useToast();

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await productService.getAdminProducts({ limit: 50 });
      setProducts(res.products || res.data?.products || res.data || []);
      const cats = await categoryService.getAdminCategories();
      setCategories(cats || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await productService.deleteProduct(productToDelete.id || productToDelete._id);
      setProducts(prev => prev.filter(p => (p.id || p._id) !== (productToDelete.id || productToDelete._id)));
      toast.success(`"${productToDelete.name}" has been removed`, 'Product Removed');
      setProductToDelete(null);
    } catch (err) {
      toast.error('Failed to remove product. Please try again.', 'Error');
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', price: '', category: '', stockCount: '', isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({ 
      name: p.name || '', 
      sku: p.sku || '', 
      price: p.price || '', 
      category: p.category?._id || p.category || '', 
      stockCount: p.stockCount || 0,
      isActive: p.isActive !== false 
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        price: Number(formData.price),
        mrp: Number(formData.price),
        category: formData.category,
        stockCount: Number(formData.stockCount),
        isActive: formData.isActive,
        unit: '1 pc'
      };
      
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id || editingProduct._id, payload);
        toast.success('Product updated');
      } else {
        await productService.createProduct(payload);
        toast.success('Product created');
      }
      setIsModalOpen(false);
      fetchCatalog();
    } catch (e) {
      toast.error('Failed to save product');
    }
  };

  const filtered = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
  });

  return (
    <div className="shop-products-page">
      <div className="products-top-bar flex justify-between items-center mb-6">
        <div>
          <h1 className="page-heading text-xl font-bold">Hub Product Catalog</h1>
          <p className="page-sub text-muted">Manage inventory, prices, stock levels, and SKUs</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={openAddModal}>
          <Plus size={16} />
          <span>Add Product</span>
        </button>
      </div>

      <div className="products-toolbar mb-4 flex justify-between">
        <div className="search-box flex items-center border p-2 rounded w-64">
          <Search size={16} className="icon mr-2 text-muted" />
          <input
            type="text"
            className="border-0 outline-none w-full"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="count-label text-muted self-end">Total SKUs: {filtered.length}</span>
      </div>

      <div className="pmart-table-wrapper">
        <table className="pmart-table w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Product</th>
              <th className="text-left py-2">Category</th>
              <th className="text-left py-2">Selling Price</th>
              <th className="text-left py-2">Stock</th>
              <th className="text-left py-2">Status</th>
              <th className="text-right py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id || p._id} className="border-b">
                <td className="py-3">
                  <div className="font-medium text-dark">{p.name}</div>
                  <div className="text-xs text-muted">SKU: {p.sku}</div>
                </td>
                <td className="py-3 text-muted">{p.category?.name || p.categorySlug || 'N/A'}</td>
                <td className="py-3 font-semibold text-dark">₹{p.price}</td>
                <td className="py-3">{p.stockCount}</td>
                <td className="py-3">
                  {p.isActive === false ? (
                    <span className="badge badge-error text-danger">Inactive</span>
                  ) : (
                    <span className="badge badge-success text-success">Active</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <div className="action-buttons flex justify-end gap-2">
                    <button className="btn-icon" onClick={() => openEditModal(p)} title="Edit" aria-label="Edit">
                      <Edit size={16} />
                    </button>
                    <button className="btn-icon delete-action text-danger" onClick={() => setProductToDelete(p)} title="Delete/Archive" aria-label="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content pmart-card" style={{ width: '500px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px' }}>
            <h3 className="font-bold text-lg mb-4">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group mb-3" style={{ gridColumn: 'span 2' }}>
                <label htmlFor="prodName">Product Name</label>
                <input id="prodName" type="text" className="form-control w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group mb-3">
                <label htmlFor="prodSku">SKU</label>
                <input id="prodSku" type="text" className="form-control w-full" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
              <div className="form-group mb-3">
                <label htmlFor="prodPrice">Price</label>
                <input id="prodPrice" type="number" className="form-control w-full" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="form-group mb-3">
                <label htmlFor="prodCat">Category</label>
                <select id="prodCat" name="category" className="form-control w-full" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group mb-3">
                <label htmlFor="prodStock">Stock Quantity</label>
                <input id="prodStock" type="number" className="form-control w-full" value={formData.stockCount} onChange={e => setFormData({...formData, stockCount: e.target.value})} />
              </div>
              <div className="form-group mb-4 flex items-center gap-2" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                <label htmlFor="isActive" className="mb-0 cursor-pointer">Is Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProduct}>Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(productToDelete)}
        onClose={() => !isDeleting && setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Product"
        message={productToDelete ? `Are you sure you want to remove "${productToDelete.name}"?` : ''}
        confirmText="Confirm"
        cancelText="Cancel"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};
