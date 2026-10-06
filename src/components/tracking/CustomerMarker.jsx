import React from 'react';
import { Home } from 'lucide-react';
import './CustomerMarker.scss';

export const CustomerMarker = ({
  x,
  y,
  label = 'Delivery Address',
  tag = 'Home'
}) => {
  return (
    <div
      className="pmart-customer-marker"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${x}px, ${y}px) translate(-50%, -100%)`
      }}
    >
      {/* Ground contact shadow */}
      <div className="marker-ground-shadow" />

      {/* Signature Google Red Pin body */}
      <div className="destination-pin-body">
        <svg viewBox="0 0 24 34" width="24" height="34" className="pin-svg">
          <path
            d="M 12 0 C 5.37 0 0 5.37 0 12 C 0 21 12 34 12 34 C 12 34 24 21 24 12 C 24 5.37 18.63 0 12 0 Z"
            fill="#ea4335"
            stroke="#c5221f"
            strokeWidth="1"
          />
          <circle cx="12" cy="11" r="5" fill="#ffffff" />
        </svg>
        <div className="pin-inner-icon">
          <Home size={10} color="#ea4335" />
        </div>
      </div>

      {/* Floating Address Tag */}
      <div className="destination-label-badge">
        <span className="dest-tag">{tag}</span>
        <span className="dest-title">{label}</span>
      </div>
    </div>
  );
};
