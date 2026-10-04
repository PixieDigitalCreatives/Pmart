import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../services/apiClient';

export const EditRiderModal = ({ isOpen, onClose, onSuccess, rider }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    licenseNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (rider) {
      setFormData({
        name: rider.name || '',
        phone: rider.phone || '',
        vehicleType: rider.vehicleType || 'Bike',
        vehicleNumber: rider.vehicleNumber || '',
        licenseNumber: rider.licenseNumber || '',
      });
    }
  }, [rider]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Phone validation
    const phoneRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
    const cleanPhone = formData.phone.replace(/\D/g, '');
    const normalizedPhone = cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;
    
    if (!phoneRegex.test(formData.phone) || normalizedPhone.length !== 10) {
      setErrorMsg('Invalid phone number. Enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/admin/riders/${rider.id}`, {
        ...formData,
        phone: normalizedPhone
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || 'Failed to update rider');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content add-rider-modal">
        <div className="modal-header">
          <h2>Edit Fleet Rider</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body p-4">
          {errorMsg && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm font-medium">
              {errorMsg}
            </div>
          )}
          
          <div className="form-group mb-3">
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input 
              type="text" 
              required 
              className="form-control w-full p-2 border rounded"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div className="form-group mb-3">
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <input 
              type="tel" 
              required 
              className="form-control w-full p-2 border rounded"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              placeholder="e.g. 9876543210"
            />
          </div>
          
          <div className="form-group mb-3">
            <label className="block text-sm font-medium mb-1">Vehicle Type *</label>
            <select 
              className="form-control w-full p-2 border rounded"
              value={formData.vehicleType}
              onChange={e => setFormData({...formData, vehicleType: e.target.value})}
            >
              <option value="Bike">Bike</option>
              <option value="Scooter">Scooter</option>
              <option value="Van">Van</option>
            </select>
          </div>
          
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-1">Vehicle Number *</label>
            <input 
              type="text" 
              required 
              className="form-control w-full p-2 border rounded"
              value={formData.vehicleNumber}
              onChange={e => setFormData({...formData, vehicleNumber: e.target.value})}
            />
          </div>

          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-1">License Number *</label>
            <input 
              type="text" 
              required 
              className="form-control w-full p-2 border rounded"
              value={formData.licenseNumber}
              onChange={e => setFormData({...formData, licenseNumber: e.target.value})}
            />
          </div>
          
          <div className="modal-footer flex justify-end gap-2 pt-4 border-t">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Rider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
