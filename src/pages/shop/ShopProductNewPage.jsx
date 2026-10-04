import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productService } from '@/services/productService';
import apiClient from '@/services/apiClient';
import { ChevronLeft, Plus, Check } from 'lucide-react';

export const ShopProductNewPage = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('PMart Fresh');
  const [categorySlug, setCategorySlug] = useState('dairy-breakfast');
  const [unit, setUnit] = useState('500 g');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [stockCount, setStockCount] = useState('50');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    apiClient.get('/categories').then(res => setCategories(res.data.data)).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const discountVal = mrp && price ? Math.max(0, Math.round(((mrp - price) / mrp) * 100)) : 0;
      await productService.createProduct({
        name,
        brand,
        categorySlug,
        subcategory: 'General',
        unit,
        price: Number(price),
        mrp: Number(mrp || price),
        discount: discountVal,
        stockCount: Number(stockCount),
        description,
        image: imageUrl,
        gallery: [imageUrl]
      });

      setSaving(false);
      navigate('/shop/products');
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="shop-product-new-page">
      <div className="mb-4">
        <Link to="/shop/products" className="text-secondary text-sm flex items-center gap-1">
          <ChevronLeft size={16} />
          <span>Back to Product Catalog</span>
        </Link>
      </div>

      <div className="pmart-card max-w-3xl">
        <h2 className="card-title text-xl font-bold mb-2">Add New Product to Darkstore</h2>
        <p className="text-muted text-sm mb-6">Create a new grocery item with price, stock, and unit specs</p>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label>Product Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Amul Salted Butter"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Brand Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Amul, Nestle, Farm Fresh"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                className="form-select"
                value={categorySlug}
                onChange={e => setCategorySlug(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c._id || c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Unit / Pack Size</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 500 g, 1 L, Pack of 4"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Selling Price (₹)</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 56"
                value={price}
                onChange={e => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>MRP (₹)</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 60"
                value={mrp}
                onChange={e => setMrp(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Initial Stock Inventory</label>
              <input
                type="number"
                className="form-control"
                value={stockCount}
                onChange={e => setStockCount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Product Image URL</label>
              <input
                type="url"
                className="form-control"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group mt-3">
            <label>Product Description</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Commercial description, ingredients, storage notes..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Plus size={16} />
              <span>{saving ? 'Creating Product...' : 'Publish Product to Catalog'}</span>
            </button>
            <Link to="/shop/products" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
