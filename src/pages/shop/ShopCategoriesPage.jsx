import React, { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useToast } from '@/context/ToastContext';

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
      <div className="mb-6 flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-xl font-bold text-dark">Darkstore Category Mapping</h1>
          <p className="text-muted text-sm">Active category aisles and subcategories stocked in Sector 62 Hub</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Add Category
        </button>
      </div>

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

      {isAddOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content pmart-card" style={{ width: '400px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px' }}>
            <h3 className="font-bold text-lg mb-4">Add Category</h3>
            <div className="form-group mb-3">
              <label htmlFor="catName">Name</label>
              <input id="catName" type="text" className="form-control w-full" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
            </div>
            <div className="form-group mb-3">
              <label htmlFor="catSlug">Slug</label>
              <input id="catSlug" type="text" className="form-control w-full" value={newCat.slug} onChange={e => setNewCat({...newCat, slug: e.target.value})} />
            </div>
            <div className="form-group mb-4">
              <label htmlFor="catDesc">Description</label>
              <input id="catDesc" type="text" className="form-control w-full" value={newCat.description} onChange={e => setNewCat({...newCat, description: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setIsAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

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
