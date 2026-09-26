import React from 'react';
import { MapPin, ChevronDown, Clock } from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import './MobileLocationStrip.scss';

export const MobileLocationStrip = () => {
  const { selectedLocation, setLocationModalOpen } = useLocation();

  return (
    <div className="mobile-location-strip" onClick={() => setLocationModalOpen(true)}>
      <div className="strip-container">
        <div className="strip-left">
          <div className="eta-badge">
            <Clock size={12} />
            <span>Express</span>
          </div>
          <div className="address-snippet">
            <span className="location-tag">{selectedLocation?.tag || 'Delivery'}</span>
            <span className="dot">•</span>
            <span className="address-text">{selectedLocation?.address?.slice(0, 30) || 'Select location'}...</span>
          </div>
        </div>
        <ChevronDown size={14} className="chevron" />
      </div>
    </div>
  );
};
