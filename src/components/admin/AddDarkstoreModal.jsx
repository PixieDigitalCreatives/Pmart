import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, MapPin, User, Phone, Package, Bike, CheckCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import './AddDarkstoreModal.scss';
import { Input, Button, Select } from '@/components/ui';

export const AddDarkstoreModal = ({ isOpen, onClose, onAddShop }) => {
  const [formData, setFormData] = useState({
    name: '',
    hubCode: '',
    city: 'Bengaluru',
    pincode: '',
    manager: '',
    phone: '',
    inventoryCount: 4500,
    activeRiders: 15
  });

  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.pincode.trim() || !formData.manager.trim()) {
      toast.error('Please fill in all mandatory darkstore parameters.', 'Incomplete Form');
      return;
    }

    const newShop = {
      id: `hub-${Date.now().toString().slice(-4)}`,
      name: formData.name,
      manager: formData.manager,
      phone: formData.phone || '+91 98450 88201',
      pincode: formData.pincode,
      city: formData.city,
      dailyOrders: 0,
      todayRevenue: 0,
      activeRiders: Number(formData.activeRiders) || 12,
      inventoryCount: Number(formData.inventoryCount) || 4000,
      status: 'Active'
    };

    onAddShop(newShop);
    toast.success(`Hub '${formData.name}' has been provisioned!`, 'Darkstore Activated');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal-content add-darkstore-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="darkstore-modal-header">
            <div className="header-info">
              <div className="icon-badge">
                <Store size={20} />
              </div>
              <div>
                <h3 className="modal-title">Provision New Darkstore</h3>
                <p className="modal-desc">Onboard a regional micro-fulfillment center to the quick delivery network</p>
              </div>
            </div>
            <Button type="button" className="close-btn" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="darkstore-modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="auto-id-needed" className="form-label">Darkstore Name *</label>
                  <Input
                    type="text"
                    
                    placeholder="e.g. PMart Darkstore #08 - Indiranagar East"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auto-id-needed" className="form-label">Hub City</label>
                  <Select
                    className="form-select"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  >
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Chennai">Chennai</option>
                  </Select>
                </div>

                <div className="form-group">
                  <label htmlFor="auto-id-needed" className="form-label">Service Pincode *</label>
                  <Input
                    type="text"
                    
                    placeholder="e.g. 560038"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    maxLength={6}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auto-id-needed" className="form-label">Hub Manager Name *</label>
                  <Input
                    type="text"
                    
                    placeholder="e.g. Arvind Swamy"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auto-id-needed" className="form-label">Manager Contact Phone</label>
                  <Input
                    type="tel"
                    
                    placeholder="+91 98450 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auto-id-needed" className="form-label">SKU Inventory Capacity</label>
                  <Input
                    type="number"
                    
                    value={formData.inventoryCount}
                    onChange={(e) => setFormData({ ...formData, inventoryCount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auto-id-needed" className="form-label">Assigned Delivery Fleet</label>
                  <Input
                    type="number"
                    
                    value={formData.activeRiders}
                    onChange={(e) => setFormData({ ...formData, activeRiders: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="darkstore-modal-footer">
              <Button type="button"  onClick={onClose} variant="secondary">
                Cancel
              </Button>
              <Button type="submit" >
                <CheckCircle size={16} />
                <span>Provision & Launch Hub</span>
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
