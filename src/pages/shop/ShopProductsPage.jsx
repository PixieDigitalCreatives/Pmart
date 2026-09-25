import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '@/services/productService';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useToast } from '@/context/ToastContext';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import './ShopProductsPage.scss';

export const ShopProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toast = useToast();

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      const res = await productService.getProducts({ limit: 50 });
      setProducts(res.products);
      setLoading(false);
    };

    fetchCatalog();
  }, []);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await productService.deleteProduct(productToDelete.id);
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast.success(`"${productToDelete.name}" has been removed from catalog`, 'Product Removed');
      setProductToDelete(null);
    } catch (err) {
      toast.error('Failed to remove product. Please try again.', 'Error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStock = async (prod) => {
    const updated = await productService.updateProduct(prod.id, { inStock: !prod.inStock });
    setProducts(prev => prev.map(p => p.id === prod.id ? updated : p));
  };

  const filtered = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.categorySlug.toLowerCase().includes(q);
  });

  return (
    <div className="shop-products-page">
      <div className="products-top-bar">
        <div>
          <h1 className="page-heading">Hub Product Catalog</h1>
          <p className="page-sub">Manage inventory, prices, stock levels, and SKUs</p>
        </div>
        <Link to="/shop/products/new" className="btn btn-primary">
          <Plus size={16} />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Search Toolbar */}
      <div className="products-toolbar">
        <div className="search-box">
          <Search size={16} className="icon" />
          <input
            type="text"
            placeholder="Search by product name, brand or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="count-label">Total SKUs: {filtered.length}</span>
      </div>

      {/* Table */}
      <div className="pmart-table-wrapper">
        <table className="pmart-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Unit Size</th>
              <th>Selling Price</th>
              <th>MRP</th>
              <th>Stock Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="product-table-cell">
                    <img src={p.image} alt={p.name} className="product-thumb" />
                    <div>
                      <div className="name font-medium">{p.name}</div>
                      <div className="brand text-xs text-muted">{p.brand}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge badge-neutral text-xs">
                    {p.categorySlug}
                  </span>
                </td>
                <td>{p.unit}</td>
                <td>
                  <span className="font-bold text-dark">₹{p.price}</span>
                </td>
                <td>
                  <span className="text-muted text-sm line-through">₹{p.mrp}</span>
                </td>
                <td>
                  <button
                    className={`stock-toggle-badge ${p.inStock ? 'in-stock' : 'out-stock'}`}
                    onClick={() => handleToggleStock(p)}
                    title="Click to toggle availability"
                  >
                    {p.inStock ? 'In Stock (Active)' : 'Out of Stock'}
                  </button>
                </td>
                <td>
                  <div className="action-buttons-group">
                    <Link to={`/product/${p.slug}`} className="btn-icon" title="Preview on customer store">
                      <Eye size={14} />
                    </Link>
                    <button
                      type="button"
                      className="btn-icon delete-action"
                      onClick={() => setProductToDelete(p)}
                      title="Delete Product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={Boolean(productToDelete)}
        onClose={() => !isDeleting && setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Product from Catalog?"
        message={
          productToDelete
            ? `Are you sure you want to remove "${productToDelete.name}" (${productToDelete.weight}) from this darkstore inventory? It will immediately disappear from the live store.`
            : ''
        }
        confirmText="Remove Product"
        cancelText="Keep in Catalog"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};
