import React from 'react';
import { Phone, Bike } from 'lucide-react';
import { ORDER_STATUS_LABELS } from '@/types/orderTypes';
import './RiderInfoCard.scss';

export const RiderInfoCard = ({
  rider,
  orderId = '',
  status = ''
}) => {
  if (!rider) return null;
  const { name: riderName, phone, vehicleType: vehicle, vehicleNumber } = rider;

  return (
    <div className="pmart-rider-info-card">
      <div className="rider-profile-row">
        {/* Avatar */}
        <div className="rider-avatar-wrap">
          <div className="avatar-circle">
            <Bike size={20} className="avatar-icon" />
          </div>
        </div>

        {/* Details */}
        <div className="rider-meta-text">
          <div className="partner-role-tag">DELIVERY PARTNER</div>
          <h4 className="rider-full-name">{riderName}</h4>
          <div className="rider-vehicle-pill">
            <span>{vehicle}</span>
            <span className="dot">•</span>
            <span>{vehicleNumber}</span>
          </div>
        </div>

      </div>

      {/* Footer Strip with Order ID, Status & Action */}
      <div className="rider-action-strip">
        <div className="order-status-badge">
          <span className="status-label">Order #{orderId}</span>
          <span className="status-pill-val">{ORDER_STATUS_LABELS[status] || status}</span>
        </div>

        <div className="contact-actions">
          <a
            href={`tel:${phone}`}
            className="btn btn-outline-red btn-sm call-btn"
            title="Call delivery partner"
          >
            <Phone size={14} />
            <span>Call rider</span>
          </a>
        </div>
      </div>
    </div>
  );
};
