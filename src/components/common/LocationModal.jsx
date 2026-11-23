import React, { useState } from 'react';
import { useLocation } from '@/context/LocationContext';
import { TbX as X, TbSearch as Search, TbHome as Home, TbBriefcase as Briefcase, TbMapPin as MapPin, TbCheck as Check, TbAlertCircle as AlertCircle } from 'react-icons/tb';
import { motion, AnimatePresence } from 'framer-motion';
import { AddressFormModal } from './AddressFormModal';
import './LocationModal.scss';
import { Input, Button } from '@/components/ui';

export const LocationModal = () => {
  const {
    isLocationModalOpen,
    setLocationModalOpen,
    selectedAddressId,
    savedLocations,
    selectLocation,
    addLocation,
    updateLocation,
    deleteLocation,
    addressLoading,
    addressError
  } = useLocation();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [autoDetect, setAutoDetect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isLocationModalOpen) return null;

  const openAddForm = () => {
    setEditingAddress(null);
    setAutoDetect(false);
    setFormModalOpen(true);
  };

  const openEditForm = (e, loc) => {
    e.stopPropagation();
    setEditingAddress(loc);
    setFormModalOpen(true);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this address?')) {
      deleteLocation(id);
    }
  };

  const handleSaveForm = async (formData) => {
    if (editingAddress) {
      await updateLocation(editingAddress._id, formData);
    } else {
      await addLocation(formData);
    }
  };

  const getTagIcon = (tag) => {
    switch ((tag || '').toLowerCase()) {
      case 'home':
        return <Home size={16} />;
      case 'work':
        return <Briefcase size={16} />;
      default:
        return <MapPin size={16} />;
    }
  };

  // Filter saved locations by search query
  const filteredLocations = searchQuery.trim()
    ? savedLocations.filter(loc => {
        const q = searchQuery.toLowerCase();
        return (
          (loc.tag || '').toLowerCase().includes(q) ||
          (loc.street || loc.address || '').toLowerCase().includes(q) ||
          (loc.city || '').toLowerCase().includes(q) ||
          (loc.pincode || '').includes(q)
        );
      })
    : savedLocations;

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={() => setLocationModalOpen(false)}>
        <motion.div
          className="modal-content location-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
        >
          <div className="modal-header">
            <div>
              <h3 className="modal-title">Select Delivery Location</h3>
              <p className="modal-subtitle">Express delivery from nearby darkstore</p>
            </div>
            <Button
              className="close-btn"
              onClick={() => setLocationModalOpen(false)}
              aria-label="Close dialog"
            >
              <X size={20} />
            </Button>
          </div>

          <div className="modal-body">
            {/* Search Input */}
            <div className="location-search-box">
              <Search size={18} className="search-icon" />
              <Input
                type="text"
                
                placeholder="Search area, apartment, street or pincode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Saved Locations */}
            <div className="saved-locations-section">
              <div className="section-label">SAVED ADDRESSES</div>

              {/* Loading State */}
              {addressLoading && (
                <div className="saved-addresses-loading">
                  <div className="skeleton-card" />
                  <div className="skeleton-card" />
                </div>
              )}

              {/* Error State */}
              {!addressLoading && addressError && (
                <div className="saved-addresses-error">
                  <AlertCircle size={16} />
                  <span>{addressError}</span>
                </div>
              )}

              {/* Empty State */}
              {!addressLoading && !addressError && savedLocations.length === 0 && (
                <div className="saved-addresses-empty">
                  <MapPin size={20} className="empty-icon" />
                  <p className="empty-title">No saved addresses yet.</p>
                  <p className="empty-desc">Add an address to make checkout faster.</p>
                </div>
              )}

              {/* Address List */}
              {!addressLoading && !addressError && savedLocations.length > 0 && (
                <div className="saved-list">
                  {filteredLocations.length === 0 && searchQuery.trim() && (
                    <div className="saved-addresses-empty">
                      <p className="empty-title">No matching addresses.</p>
                    </div>
                  )}
                  {filteredLocations.map((loc) => {
                    const isSelected = selectedAddressId === loc._id;
                    return (
                      <div
                        key={loc._id}
                        className={`saved-location-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => selectLocation(loc)}
                      >
                        <div className={`loc-icon-wrapper ${isSelected ? 'selected' : ''}`}>
                          {getTagIcon(loc.tag)}
                        </div>
                        <div className="loc-details">
                          <div className="loc-tag">
                            <span>{loc.tag}</span>
                            {loc.isDefault && <span className="default-pill">Default</span>}
                          </div>
                          <div className="loc-address-text">
                            {loc.recipientName} {loc.recipientPhone ? `• ${loc.recipientPhone}` : ''}
                          </div>
                          <div className="loc-address-text">
                            {[loc.houseNumber, loc.buildingName, loc.street, loc.area, loc.landmark].filter(Boolean).join(', ')}
                          </div>
                          {(loc.city || loc.district || loc.state || loc.pincode) && (
                            <div className="loc-pincode">
                              {[loc.city, loc.district, loc.state].filter(Boolean).join(', ')}
                              {loc.pincode ? ` - ${loc.pincode}` : ''}
                            </div>
                          )}
                          {loc.deliveryInstructions && (
                            <div className="loc-instructions">Instr: {loc.deliveryInstructions}</div>
                          )}
                          <div className="loc-actions">
                            <Button onClick={(e) => openEditForm(e, loc)}>Edit</Button>
                            <Button onClick={(e) => handleDelete(e, loc._id)}>Delete</Button>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="selected-check">
                            <Check size={18} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="modal-footer">
            <Button className="add-address-btn" onClick={openAddForm}>
              + Add New Address
            </Button>
          </div>
        </motion.div>
      </div>

      <AddressFormModal 
        isOpen={formModalOpen} 
        onClose={() => {
          setFormModalOpen(false);
          setAutoDetect(false);
        }} 
        onSave={handleSaveForm}
        initialData={editingAddress}
        autoDetect={autoDetect}
      />
    </AnimatePresence>
  );
};

