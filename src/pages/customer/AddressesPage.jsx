import React, { useState } from 'react';
import { useLocation } from '@/context/LocationContext';
import { AddressFormModal } from '@/components/common/AddressFormModal';
import {
  MapPin,
  Home,
  Briefcase,
  Plus,
  Trash2,
  CheckCircle2,
  MapPinOff
} from 'lucide-react';
import { PageHeader, Button, EmptyState } from '@/components/ui';
import { getFullAddressString } from '@/utils/addressUtils';
import './AddressesPage.scss';

export const AddressesPage = () => {
  const { savedLocations, selectedLocation, selectLocation, addLocation, updateLocation, deleteLocation, setDefaultAddress, addressLoading } = useLocation();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this address?')) {
      deleteLocation(id);
    }
  };

  const handleSetDefault = (e, id) => {
    e.stopPropagation();
    setDefaultAddress(id);
  };

  const openAddForm = () => {
    setEditingAddress(null);
    setFormModalOpen(true);
  };

  const openEditForm = (addr) => {
    setEditingAddress(addr);
    setFormModalOpen(true);
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
        return <Home size={15} />;
      case 'work':
        return <Briefcase size={15} />;
      default:
        return <MapPin size={15} />;
    }
  };

  return (
    <div className="pmart-addresses-page">
      <div className="container">
        <PageHeader
          title="Manage Delivery Addresses"
          subtitle="Save your home, office, and frequent delivery locations"
          action={
            <Button variant="primary" onClick={openAddForm}>
              <Plus size={16} style={{ marginRight: '8px' }} />
              <span>Add New Address</span>
            </Button>
          }
        />

        {addressLoading && savedLocations.length === 0 && (
          <div className="py-8 text-center text-gray-500">Loading addresses...</div>
        )}

        {!addressLoading && savedLocations.length === 0 && (
          <div style={{ marginTop: '32px' }}>
            <EmptyState
              icon={MapPinOff}
              title="No saved addresses"
              description="You haven't saved any addresses yet."
            />
          </div>
        )}

        {/* Addresses Grid */}
        <div className="addresses-cards-grid">
          {savedLocations.map((addr) => {
            const isSelected = selectedLocation?._id === addr._id;
            return (
              <div 
                key={addr._id} 
                className={`address-card ${isSelected ? 'active-delivery' : ''}`}
                onClick={() => selectLocation(addr._id)}
              >
                <div className="card-top-row">
                  <div className="tag-badge">
                    {getTagIcon(addr.tag || addr.label)}
                    <span>{addr.tag || addr.label}</span>
                  </div>
                  {addr.isDefault && <span className="default-chip">Default</span>}
                </div>

                <div className="address-body-text font-semibold">{addr.recipientName} ({addr.recipientPhone})</div>
                <div className="address-body-text">{getFullAddressString(addr)}</div>
                {addr.landmark && <div className="pincode-note">Landmark: {addr.landmark}</div>}
                
                {addr.location?.coordinates && (
                  <div className="text-xs text-gray-400 mt-1">
                    GPS: {addr.location.coordinates[1].toFixed(4)}, {addr.location.coordinates[0].toFixed(4)}
                  </div>
                )}

                <div className="card-actions-row">
                  {!addr.isDefault && (
                    <button className="action-btn set-default" onClick={(e) => handleSetDefault(e, addr._id)}>
                      Set as Default
                    </button>
                  )}
                  <button className="action-btn edit-btn" onClick={(e) => { e.stopPropagation(); openEditForm(addr); }}>
                    Edit
                  </button>
                  <button className="action-btn delete-btn" aria-label="Delete" onClick={(e) => handleDelete(e, addr._id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
                
                {isSelected && (
                  <div className="absolute top-4 right-4 text-green-600">
                    <CheckCircle2 size={24} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AddressFormModal 
          isOpen={formModalOpen} 
          onClose={() => setFormModalOpen(false)} 
          onSave={handleSaveForm}
          initialData={editingAddress}
        />
      </div>
    </div>
  );
};
