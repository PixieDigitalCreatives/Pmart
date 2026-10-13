import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { shopService } from '@/services/shopService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ChevronLeft, Save, AlertTriangle } from 'lucide-react';
import { Input, Button, Select, Card, FormField, PageHeader, LoadingState } from '@/components/ui';

// Tags that place a product in a home-page section (see HomePage TAG_SECTIONS).
const HOME_TAGS = [
  { tag: 'daily-essentials', label: 'Daily Essentials' },
  { tag: 'fresh-picks', label: 'Fresh Picks' },
  { tag: 'best-deals', label: 'Best Deals' },
  { tag: 'under-99', label: 'Under ₹99' }
];

const EMPTY = {
  name: '',
  category: '',
  subcategory: '',
  shop: '',
  brand: '',
  sku: '',
  unit: '',
  price: '',
  mrp: '',
  stockCount: '',
  imageUrl: '',
  gallery: '',
  description: '',
  tags: [],
  extraTags: '',
  specifications: '',
  nutrition: '',
  isActive: true
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

export const ShopProductNewPage = ({ basePath = '/shop/products' }) => {
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useAuth();
  const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';

  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [cats, shopList, product] = await Promise.all([
          categoryService.getManagedCategories(),
          isStaff ? shopService.getPublicShops() : Promise.resolve([]),
          isEdit ? productService.getManagedProduct(id) : Promise.resolve(null)
        ]);
        if (cancelled) return;
        setCategories(cats.filter((c) => c.isActive || (product && String(c._id) === String(product.category?._id))));
        setShops(shopList);
        if (product) {
          const homeTags = HOME_TAGS.map((t) => t.tag);
          setForm({
            ...EMPTY,
            name: product.name,
            category: product.category?._id || '',
            subcategory: product.subcategory || '',
            shop: product.shop?._id || '',
            brand: product.brand || '',
            sku: product.sku || '',
            unit: product.unit,
            price: String(product.price),
            mrp: product.mrp && product.mrp !== product.price ? String(product.mrp) : '',
            stockCount: String(product.stockCount),
            imageUrl: product.imageUrl || '',
            gallery: (product.gallery || []).join('\n'),
            description: product.description || '',
            tags: (product.tags || []).filter((t) => homeTags.includes(t)),
            extraTags: (product.tags || []).filter((t) => !homeTags.includes(t)).join(', '),
            specifications: mapToLines(product.specifications),
            nutrition: mapToLines(product.nutrition),
            isActive: product.isActive
          });
        } else if (shopList.length === 1) {
          setForm((f) => ({ ...f, shop: shopList[0]._id }));
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
  }, [id, isEdit, isStaff]);

  if (loading) return <LoadingState text="Loading..." />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const toggleTag = (tag) => setForm({ ...form, tags: form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag] });
  const selectedCategory = categories.find((c) => String(c._id) === String(form.category));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const price = Number(form.price);
    const mrp = form.mrp === '' ? null : Number(form.mrp);
    const stock = Number(form.stockCount);
    if (!form.name.trim() || !form.category || !form.unit.trim()) return setError('Name, category and unit are required.');
    if (!Number.isFinite(price) || price < 0) return setError('Enter a valid price.');
    if (mrp !== null && (!Number.isFinite(mrp) || mrp < price)) return setError('MRP must be a number not lower than the price.');
    if (!Number.isInteger(stock) || stock < 0) return setError('Stock must be a whole number (0 or more).');
    if (isStaff && !form.shop) return setError('Choose the store that sells this product.');

    const payload = {
      name: form.name.trim(),
      category: form.category,
      subcategory: form.subcategory,
      brand: form.brand.trim(),
      sku: form.sku.trim(),
      unit: form.unit.trim(),
      price,
      mrp,
      stockCount: stock,
      imageUrl: form.imageUrl.trim(),
      gallery: form.gallery.split('\n').map((s) => s.trim()).filter(Boolean),
      description: form.description.trim(),
      tags: [...new Set([...form.tags, ...form.extraTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)])],
      specifications: linesToMap(form.specifications),
      nutrition: linesToMap(form.nutrition),
      isActive: form.isActive
    };
    if (isStaff) payload.shop = form.shop;

    setSaving(true);
    try {
      if (isEdit) {
        await productService.updateProduct(id, payload);
        toast.success('Product saved.');
      } else {
        await productService.createProduct(payload);
        toast.success('Product added.');
      }
      navigate(basePath);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the product.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link to={basePath} className="flex items-center gap-1 text-sm mb-3">
        <ChevronLeft size={16} />
        <span>Back to products</span>
      </Link>
      <PageHeader title={isEdit ? 'Edit product' : 'Add product'} />

      {categories.length === 0 && (
        <div className="alert alert-warning mb-4">
          <AlertTriangle size={16} />
          <span>No categories exist yet. {isStaff ? <Link to="/admin/categories">Create a category</Link> : 'Ask the platform admin to create categories.'} before adding products.</span>
        </div>
      )}

      <form onSubmit={submit} className="max-w-3xl">
        <Card className="mb-4">
          <h3 className="section-heading mb-3">Basics</h3>
          <FormField label="Product name *" htmlFor="p-name">
            <Input id="p-name" value={form.name} onChange={set('name')} maxLength={150} />
          </FormField>
          <div className="form-grid">
            <FormField label="Category *" htmlFor="p-category">
              <Select id="p-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '' })}>
                <option value="">Choose a category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Sub-category" htmlFor="p-sub">
              <Select id="p-sub" value={form.subcategory} onChange={set('subcategory')} disabled={!selectedCategory?.subcategories?.length}>
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
                <Select id="p-shop" value={form.shop} onChange={set('shop')}>
                  <option value="">Choose a store</option>
                  {shops.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Brand" htmlFor="p-brand">
              <Input id="p-brand" value={form.brand} onChange={set('brand')} maxLength={80} />
            </FormField>
            <FormField label="Unit / pack size *" htmlFor="p-unit" hint="e.g. 1 kg, 500 ml, pack of 6">
              <Input id="p-unit" value={form.unit} onChange={set('unit')} maxLength={40} />
            </FormField>
            <FormField label="SKU" htmlFor="p-sku" hint="Unique within the store">
              <Input id="p-sku" value={form.sku} onChange={set('sku')} maxLength={64} />
            </FormField>
          </div>
        </Card>

        <Card className="mb-4">
          <h3 className="section-heading mb-3">Price and stock</h3>
          <div className="form-grid">
            <FormField label="Selling price (₹) *" htmlFor="p-price">
              <Input id="p-price" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} />
            </FormField>
            <FormField label="MRP (₹)" htmlFor="p-mrp" hint="Leave empty if same as price">
              <Input id="p-mrp" type="number" min="0" step="0.01" value={form.mrp} onChange={set('mrp')} />
            </FormField>
            <FormField label="Units in stock *" htmlFor="p-stock">
              <Input id="p-stock" type="number" min="0" step="1" value={form.stockCount} onChange={set('stockCount')} />
            </FormField>
          </div>
          <label htmlFor="p-active" className="flex items-center gap-2">
            <input id="p-active" type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            Visible in the store
          </label>
        </Card>

        <Card className="mb-4">
          <h3 className="section-heading mb-3">Images and description</h3>
          <FormField label="Main image URL" htmlFor="p-image">
            <Input id="p-image" type="url" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
          </FormField>
          {form.imageUrl && <img src={form.imageUrl} alt="" style={{ maxHeight: 120, marginBottom: 12 }} />}
          <FormField label="More image URLs" htmlFor="p-gallery" hint="One URL per line">
            <textarea id="p-gallery" className="form-control" rows="2" value={form.gallery} onChange={set('gallery')} />
          </FormField>
          <FormField label="Description" htmlFor="p-desc">
            <textarea id="p-desc" className="form-control" rows="3" value={form.description} onChange={set('description')} maxLength={4000} />
          </FormField>
        </Card>

        <Card className="mb-4">
          <h3 className="section-heading mb-3">Merchandising and details</h3>
          <span className="text-sm font-semibold block mb-2">Show on the home page in</span>
          <div className="flex flex-wrap gap-3 mb-3">
            {HOME_TAGS.map((t) => (
              <label key={t.tag} htmlFor={`tag-${t.tag}`} className="flex items-center gap-1 text-sm">
                <input id={`tag-${t.tag}`} type="checkbox" checked={form.tags.includes(t.tag)} onChange={() => toggleTag(t.tag)} />
                {t.label}
              </label>
            ))}
          </div>
          <FormField label="Other search tags" htmlFor="p-tags" hint="Comma separated">
            <Input id="p-tags" value={form.extraTags} onChange={set('extraTags')} />
          </FormField>
          <div className="form-grid">
            <FormField label="Specifications" htmlFor="p-specs" hint="One per line, e.g. Shelf life: 6 months">
              <textarea id="p-specs" className="form-control" rows="4" value={form.specifications} onChange={set('specifications')} />
            </FormField>
            <FormField label="Nutrition" htmlFor="p-nutrition" hint="One per line, e.g. Energy: 120 kcal">
              <textarea id="p-nutrition" className="form-control" rows="4" value={form.nutrition} onChange={set('nutrition')} />
            </FormField>
          </div>
        </Card>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
        <div className="actions-row">
          <Button type="submit" variant="primary" isLoading={saving} disabled={categories.length === 0}>
            <Save size={16} style={{ marginRight: 6 }} />
            {isEdit ? 'Save product' : 'Add product'}
          </Button>
          <Button component={Link} to={basePath} variant="secondary">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
