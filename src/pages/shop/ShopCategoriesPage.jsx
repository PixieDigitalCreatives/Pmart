import React, { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { TbPlus as Plus, TbEdit as Edit, TbTrash as Trash2, TbEye as Eye, TbEyeOff as EyeOff, TbStack2 as Layers } from 'react-icons/tb';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Button, Modal, FormField, Input, StatusBadge, LoadingState, EmptyState } from '@/components/ui';

const EMPTY = { name: '', description: '', imageUrl: '', subcategories: '', sortOrder: '0' };

export const ShopCategoriesPage = () => {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | category
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    try {
      setCategories(await categoryService.getManagedCategories());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load categories.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setForm(EMPTY);
    setFormError('');
    setEditing('new');
  };

  const openEdit = (c) => {
    setForm({ name: c.name, description: c.description || '', imageUrl: c.imageUrl || '', subcategories: (c.subcategories || []).join(', '), sortOrder: String(c.sortOrder || 0) });
    setFormError('');
    setEditing(c);
  };

  const save = async () => {
    if (!form.name.trim()) return setFormError('Name is required.');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      subcategories: [...new Set(form.subcategories.split(',').map((s) => s.trim()).filter(Boolean))],
      sortOrder: Math.max(0, parseInt(form.sortOrder, 10) || 0)
    };
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        await categoryService.createCategory(payload);
        toast.success('Category created.');
      } else {
        await categoryService.updateCategory(editing._id, payload);
        toast.success('Category saved.');
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save the category.'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c) => {
    try {
      await categoryService.setCategoryActive(c._id, !c.isActive);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async () => {
    try {
      await categoryService.deleteCategory(toDelete._id);
      toast.success('Category deleted.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setToDelete(null);
    }
  };

  if (loading) return <LoadingState text="Loading categories..." />;

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Customers browse the store by these categories"
        action={
          <Button variant="primary" onClick={openNew}>
            <Plus size={16} style={{ marginRight: 8 }} />
            Add category
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState icon={Layers} title="No categories yet" description="Create categories before adding products." action={<Button variant="primary" onClick={openNew}>Add category</Button>} />
      ) : (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Name</th>
                <th>Sub-categories</th>
                <th>Products</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c._id}>
                  <td>{c.sortOrder}</td>
                  <td>
                    <div className="font-semibold">{c.name}</div>
                    <div className="muted-note">/{c.slug}</div>
                  </td>
                  <td className="text-sm">{(c.subcategories || []).join(', ') || '—'}</td>
                  <td>{c.productCount}</td>
                  <td>
                    <StatusBadge status={c.isActive ? 'Visible' : 'Hidden'} type={c.isActive ? 'success' : 'neutral'} />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`}>
                      <Edit size={14} />
                    </Button>{' '}
                    <Button size="sm" variant="secondary" onClick={() => toggle(c)} aria-label={c.isActive ? `Hide ${c.name}` : `Show ${c.name}`}>
                      {c.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>{' '}
                    <Button size="sm" variant="secondary" onClick={() => setToDelete(c)} disabled={c.productCount > 0} title={c.productCount > 0 ? 'Move or archive its products first' : 'Delete'} aria-label={`Delete ${c.name}`}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={Boolean(editing)} onClose={() => !saving && setEditing(null)} title={editing === 'new' ? 'Add category' : 'Edit category'}>
        <FormField label="Name *" htmlFor="cat-name">
          <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />
        </FormField>
        <FormField label="Description" htmlFor="cat-desc">
          <Input id="cat-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
        </FormField>
        <FormField label="Image URL" htmlFor="cat-image">
          <Input id="cat-image" type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
        </FormField>
        <FormField label="Sub-categories" htmlFor="cat-subs" hint="Comma separated, e.g. Milk, Curd, Paneer">
          <Input id="cat-subs" value={form.subcategories} onChange={(e) => setForm({ ...form, subcategories: e.target.value })} />
        </FormField>
        <FormField label="Display order" htmlFor="cat-order" hint="Lower numbers appear first">
          <Input id="cat-order" type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </FormField>
        {formError && <div className="alert alert-error mb-3">{formError}</div>}
        <div className="actions-row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} isLoading={saving}>
            Save
          </Button>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Delete category"
        message={toDelete ? `Delete "${toDelete.name}"? This cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
