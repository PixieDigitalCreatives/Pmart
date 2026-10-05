import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { X } from 'lucide-react';
import './AddDarkstoreModal.scss';

import { PermissionSelector } from './PermissionSelector';

export const EditEmployeeModal = ({ isOpen, onClose, onSuccess, employee }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    isActive: true,
    permissions: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        phone: employee.phone || '',
        email: employee.email || '',
        isActive: employee.isActive ?? true,
        permissions: employee.permissions || []
      });
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminService.updateEmployee(employee.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update employee');
    } finally {
      setLoading(false);
    }
  };


  const isAdmin = employee.role === 'ADMIN';

  return (
    <div className="modal-overlay">
      <div className="modal-content flex flex-col max-h-[90vh]" style={{ maxWidth: '600px' }}>
        <div className="modal-header shrink-0 flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Edit {isAdmin ? 'Administrator' : 'Employee'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body flex-1 overflow-y-auto p-6">
          {error && <div className="error-message mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
          
          <form onSubmit={handleSubmit} id="editEmployeeForm" className="space-y-4">
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input 
                type="text" 
                required 
                className="form-control w-full p-2 border rounded"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="block text-sm font-medium mb-1">Mobile Number *</label>
                <input 
                  type="tel" 
                  required 
                  className="form-control w-full p-2 border rounded"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input 
                  type="email" 
                  className="form-control w-full p-2 border rounded"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="form-checkbox text-primary rounded border-gray-300"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                />
                <span className="font-semibold text-gray-800">Account Active</span>
              </label>
            </div>

            {!isAdmin && (
              <div className="form-group pt-2">
                <label className="font-bold text-gray-800 mb-2 block">Access Permissions</label>
                <PermissionSelector 
                  selectedPermissions={formData.permissions} 
                  onChange={(newPermissions) => setFormData(prev => ({ ...prev, permissions: newPermissions }))}
                />
              </div>
            )}
            
            {isAdmin && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-600">
                <strong>Note:</strong> Administrators automatically have all permissions.
              </div>
            )}
          </form>
        </div>

        <div className="modal-footer shrink-0 p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <button type="button" className="btn btn-secondary px-4 py-2 border rounded hover:bg-gray-100 transition-colors" onClick={onClose}>Cancel</button>
          <button type="submit" form="editEmployeeForm" className="btn btn-primary px-4 py-2 rounded bg-pmart-red text-white hover:bg-red-700 transition-colors" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
