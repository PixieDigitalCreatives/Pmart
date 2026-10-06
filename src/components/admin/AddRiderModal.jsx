import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import api from '../../services/apiClient';

export const AddRiderModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    licenseNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setSuccessData(null);
    setFormData({ name: '', email: '', phone: '', vehicleType: 'Bike', vehicleNumber: '', licenseNumber: '', password: '', confirmPassword: '' });
    setErrorMsg('');
    setShowPassword(false);
    onClose();
  };

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

    if (formData.password.length < 8) {
      setErrorMsg('Initial password must be at least 8 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send normalized phone
      const response = await api.post('/admin/riders', {
        ...formData,
        phone: normalizedPhone
      });
      setSuccessData(response.data);
      onSuccess();
    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || 'Failed to create rider');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content add-rider-modal">
        <div className="modal-header">
          <h2>Add Fleet Rider</h2>
          <button className="icon-btn" onClick={handleClose}><X size={20} /></button>
        </div>
        
        {successData ? (
          <div className="modal-body p-4">
            <div className="bg-green-100 text-green-800 p-4 rounded mb-4">
              <h3 className="font-bold mb-2">Rider Created Successfully!</h3>
              <p className="text-sm">
                The rider account has been securely provisioned. The rider can now log in using their registered mobile number and the initial password you provided.
              </p>
            </div>
            <div className="modal-footer flex justify-end gap-2 pt-4 border-t">
              <button type="button" className="btn btn-primary" onClick={handleClose}>Done</button>
            </div>
          </div>
        ) : (
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
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input 
              type="email" 
              required 
              className="form-control w-full p-2 border rounded"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
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

          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-1">Initial Password *</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                className="form-control w-full p-2 border rounded pr-10"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              className="form-control w-full p-2 border rounded"
              value={formData.confirmPassword}
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>
          
          <div className="modal-footer flex justify-end gap-2 pt-4 border-t">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Rider'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
