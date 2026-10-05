import React, { useState } from 'react';
import { adminService } from '@/services/adminService';
import { X } from 'lucide-react';
import './AddDarkstoreModal.scss'; // Reusing modal styles

import { PermissionSelector } from './PermissionSelector';

export const AddEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    permissions: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [setupToken, setSetupToken] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.createEmployee(formData);
      setSetupToken(res.setupToken);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', phone: '', email: '', permissions: [] });
    setSetupToken(null);
    setError(null);
    onClose();
    if (setupToken) onSuccess();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content flex flex-col max-h-[90vh]" style={{ maxWidth: '600px' }}>
        <div className="modal-header shrink-0 flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Add New Employee</h2>
          <button className="btn-icon" onClick={handleClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body flex-1 overflow-y-auto p-6">
          {error && <div className="error-message mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
          
          {setupToken ? (
            <div className="success-state text-center p-6">
              <div className="mb-4">
                <span className="badge badge-success text-lg p-2">Employee Created Successfully</span>
              </div>
              <p className="mb-4 text-dark">Please share this one-time setup token with the employee securely. They will need it to set their password.</p>
              <div className="p-4 bg-gray-100 rounded-lg font-mono text-lg break-all select-all">
                {setupToken}
              </div>
              <button className="btn btn-primary mt-6 w-full" onClick={handleClose}>
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="addEmployeeForm" className="space-y-4">
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
                    placeholder="+91"
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
                <label className="font-bold text-gray-800 mb-2 block">Access Permissions</label>
                <PermissionSelector 
                  selectedPermissions={formData.permissions} 
                  onChange={(newPermissions) => setFormData(prev => ({ ...prev, permissions: newPermissions }))}
                />
              </div>
            </form>
          )}
        </div>

        {!setupToken && (
          <div className="modal-footer shrink-0 p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
            <button type="button" className="btn btn-secondary px-4 py-2 border rounded hover:bg-gray-100 transition-colors" onClick={handleClose}>Cancel</button>
            <button type="submit" form="addEmployeeForm" className="btn btn-primary px-4 py-2 rounded bg-pmart-red text-white hover:bg-red-700 transition-colors" disabled={loading}>
              {loading ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
