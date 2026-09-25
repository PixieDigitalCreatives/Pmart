import React, { useState } from 'react';
import { useLocation } from '@/context/LocationContext';
import { X, Search, Navigation, Home, Briefcase, MapPin, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './LocationModal.scss';

export const LocationModal = () => {
  const {
    isLocationModalOpen,
    setLocationModalOpen,
    selectedLocation,
    savedLocations,
    selectLocation,
    useCurrentLocation,
    addLocation
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  if (!isLocationModalOpen) return null;

  const handleUseCurrentLocation = () => {
    setIsDetecting(true);
    setTimeout(() => {
      useCurrentLocation();
      setIsDetecting(false);
    }, 500);
  };

  const getTagIcon = (tag) => {
    switch (tag.toLowerCase()) {
      case 'home':
        return <Home size={16} />;
      case 'work':
        return <Briefcase size={16} />;
      default:
        return <MapPin size={16} />;
    }
  };

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
              <p className="modal-subtitle">Fast 10-minute delivery from nearby darkstore</p>
            </div>
            <button
              className="close-btn"
              onClick={() => setLocationModalOpen(false)}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            {/* Search Input */}
            <div className="location-search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search area, apartment, street or pincode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* GPS Detection */}
            <button
              className="current-location-btn"
              onClick={handleUseCurrentLocation}
              disabled={isDetecting}
            >
              <div className="gps-icon-wrapper">
                <Navigation size={18} className={isDetecting ? 'spinning' : ''} />
              </div>
              <div className="gps-text">
                <span className="gps-title">
                  {isDetecting ? 'Detecting GPS Location...' : 'Use Current Location'}
                </span>
                <span className="gps-desc">Using device GPS for precise doorstep delivery</span>
              </div>
            </button>

            {/* Saved Locations */}
            <div className="saved-locations-section">
              <div className="section-label">SAVED ADDRESSES</div>
              <div className="saved-list">
                {savedLocations.map((loc) => {
                  const isSelected = selectedLocation?.id === loc.id;
                  return (
                    <div
                      key={loc.id}
                      className={`saved-location-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => selectLocation(loc)}
                    >
                      <div className="loc-icon-wrapper">
                        {getTagIcon(loc.tag)}
                      </div>
                      <div className="loc-details">
                        <div className="loc-tag">
                          <span>{loc.tag}</span>
                          {loc.isDefault && <span className="default-pill">Default</span>}
                        </div>
                        <div className="loc-address-text">{loc.address}</div>
                        <div className="loc-pincode">Pincode: {loc.pincode}</div>
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
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
