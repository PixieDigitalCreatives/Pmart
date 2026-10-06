import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useToast } from '@/context/ToastContext';
import { Package, Plus, Search, Edit, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { PageHeader, Button, StatusBadge, Modal, FormField, Input, Select } from '@/components/ui';
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
      <PageHeader 
        title="Hub Product Catalog"
        subtitle="Manage inventory, prices, stock levels, and SKUs"
        action={
          <Button variant="primary" onClick={openAddModal}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            <span>Add Product</span>
          </Button>
        }
      />

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
                    <StatusBadge status="Inactive" type="error" />
                  ) : (
                    <StatusBadge status="Active" type="success" />
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
      >
        <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <FormField label="Product Name" htmlFor="prodName">
              <Input id="prodName" type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </FormField>
          </div>
          <FormField label="SKU" htmlFor="prodSku">
            <Input id="prodSku" type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
          </FormField>
          <FormField label="Price" htmlFor="prodPrice">
            <Input id="prodPrice" type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
          </FormField>
          <FormField label="Category" htmlFor="prodCat">
            <Select 
              id="prodCat" 
              name="category" 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})}
              options={[
                { value: '', label: 'Select Category' },
                ...categories.map(c => ({ value: c.id || c._id, label: c.name }))
              ]}
            />
          </FormField>
          <FormField label="Stock Quantity" htmlFor="prodStock">
            <Input id="prodStock" type="number" value={formData.stockCount} onChange={e => setFormData({...formData, stockCount: e.target.value})} />
          </FormField>
          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
            <label htmlFor="isActive" className="mb-0 cursor-pointer">Is Active</label>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveProduct}>Save</Button>
        </div>
      </Modal>

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
