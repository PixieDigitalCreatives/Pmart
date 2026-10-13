import React from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import { getFullAddressString } from '@/utils/addressUtils';
import './MobileLocationStrip.scss';

const shortAddress = (loc) => {
  const full = getFullAddressString(loc);
  return full.length > 30 ? full.slice(0, 30) + '…' : full;
};

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
            <span className="address-text">{(selectedLocation && shortAddress(selectedLocation)) || 'Select location'}</span>
          </div>
        </div>
        <ChevronDown size={14} className="chevron" />
      </div>
    </div>
  );
};
