import React, { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Button, Modal, FormField, Input } from '@/components/ui';

export const ShopCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', slug: '', description: '' });
  const [deleteId, setDeleteId] = useState(null);
  const toast = useToast();

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getAdminCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSave = async () => {
    try {
      await categoryService.createCategory(newCat);
      toast.success('Category created');
      setIsAddOpen(false);
      setNewCat({ name: '', slug: '', description: '' });
      fetchCategories();
    } catch (e) {
      toast.error('Failed to create category');
    }
  };

  const handleDelete = async () => {
    try {
      await categoryService.deleteCategory(deleteId);
      toast.success('Category deleted');
      setDeleteId(null);
      fetchCategories();
    } catch (e) {
      toast.error('Failed to delete category');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="shop-categories-page">
      <PageHeader
        title="Darkstore Category Mapping"
        subtitle="Active category aisles and subcategories stocked in Sector 62 Hub"
        action={
          <Button variant="primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} style={{ marginRight: '8px' }} /> Add Category
          </Button>
        }
      />

      <div className="pmart-table-wrapper">
        <table className="pmart-table w-full">
          <thead>
            <tr>
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Slug</th>
              <th className="text-right py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id || c._id} className="border-t">
                <td className="py-3">{c.name}</td>
                <td className="py-3 text-muted">{c.slug}</td>
                <td className="py-3 text-right">
                  <button className="btn-icon delete-action text-danger" onClick={() => setDeleteId(c.id || c._id)} aria-label="Delete">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Category"
      >
        <div className="space-y-4">
          <FormField label="Name" htmlFor="catName">
            <Input id="catName" type="text" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
          </FormField>
          <FormField label="Slug" htmlFor="catSlug">
            <Input id="catSlug" type="text" value={newCat.slug} onChange={e => setNewCat({...newCat, slug: e.target.value})} />
          </FormField>
          <FormField label="Description" htmlFor="catDesc">
            <Input id="catDesc" type="text" value={newCat.description} onChange={e => setNewCat({...newCat, description: e.target.value})} />
          </FormField>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category?"
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
};
