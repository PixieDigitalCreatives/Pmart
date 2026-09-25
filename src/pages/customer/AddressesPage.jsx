import React, { useState } from 'react';
import { useLocation } from '@/context/LocationContext';
import {
  MapPin,
  Home,
  Briefcase,
  Plus,
  Trash2,
  Check,
  Edit2,
  X,
  CheckCircle2
} from 'lucide-react';
import './AddressesPage.scss';

export const AddressesPage = () => {
  const { savedLocations, selectedLocation, selectLocation, addLocation } = useLocation();

  const [addresses, setAddresses] = useState(savedLocations);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTag, setNewTag] = useState('Home');
  const [newLine1, setNewLine1] = useState('');
  const [newPincode, setNewPincode] = useState('201309');

  const handleDelete = (id) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  const handleSetDefault = (addr) => {
    const updated = addresses.map(a => ({
      ...a,
      isDefault: a.id === addr.id
    }));
    setAddresses(updated);
    selectLocation(addr);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newLine1.trim()) return;

    const newAddr = {
      id: `addr-${Date.now()}`,
      tag: newTag,
      address: newLine1,
      pincode: newPincode,
      isDefault: false
    };

    setAddresses(prev => [newAddr, ...prev]);
    addLocation(newAddr);
    setIsAddModalOpen(false);
    setNewLine1('');
  };

  return (
    <div className="pmart-addresses-page">
      <div className="container">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Manage Delivery Addresses</h1>
            <p className="page-subtitle">Save your home, office, and frequent delivery locations</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            <span>Add New Address</span>
          </button>
        </div>

        {/* Addresses Grid */}
        <div className="addresses-cards-grid">
          {addresses.map((addr) => {
            const isSelected = selectedLocation?.id === addr.id;
            return (
              <div key={addr.id} className={`address-card ${isSelected ? 'active-delivery' : ''}`}>
                <div className="card-top-row">
                  <div className="tag-badge">
                    {addr.tag === 'Home' ? <Home size={15} /> : <Briefcase size={15} />}
                    <span>{addr.tag}</span>
                  </div>
                  {addr.isDefault && <span className="default-chip">Default</span>}
                </div>

                <div className="address-body-text">{addr.address}</div>
                <div className="pincode-note">Pincode: {addr.pincode}</div>

                <div className="card-actions-row">
                  {!addr.isDefault && (
                    <button
                      className="action-btn set-default"
                      onClick={() => handleSetDefault(addr)}
                    >
                      Set as Default
                    </button>
                  )}
                  {isSelected && (
                    <span className="delivering-here-tag">
                      <CheckCircle2 size={14} />
                      <span>Current Location</span>
                    </span>
                  )}
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(addr.id)}
                    aria-label="Delete address"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Address Modal */}
        {isAddModalOpen && (
          <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
            <div className="modal-content add-address-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Delivery Address</h3>
                <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="add-addr-form">
                <div className="form-group">
                  <label>Address Type</label>
                  <div className="tag-selector-row">
                    {['Home', 'Work', 'Friends & Family', 'Other'].map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`type-chip ${newTag === t ? 'active' : ''}`}
                        onClick={() => setNewTag(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>House / Flat / Building / Street</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="e.g. Flat 501, Tower C, Stellar Greens, Sector 62"
                    value={newLine1}
                    onChange={e => setNewLine1(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newPincode}
                    onChange={e => setNewPincode(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary btn-full">
                    Save Delivery Address
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
