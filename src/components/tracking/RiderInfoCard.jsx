import React from 'react';
import { Phone, ShieldCheck, Bike, Star, MessageSquare } from 'lucide-react';
import './RiderInfoCard.scss';

export const RiderInfoCard = ({
  rider = {},
  orderId = '',
  status = 'Out for Delivery',
  onContactClick = null
}) => {
  const riderName = rider.name;
  const phone = rider.phone;
  const vehicle = rider.vehicleType;
  const vehicleNumber = rider.vehicleNumber;
  const rating = rider.rating;

  return (
    <div className="pmart-rider-info-card">
      <div className="rider-profile-row">
        {/* Avatar */}
        <div className="rider-avatar-wrap">
          <div className="avatar-circle">
            <Bike size={20} className="avatar-icon" />
          </div>
          <span className="verified-badge" title="Background verified partner">
            <ShieldCheck size={11} />
          </span>
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

        {/* Rating */}
        <div className="rider-rating-badge">
          <Star size={12} className="star-icon" />
          <span>{rating}</span>
        </div>
      </div>

      {/* Footer Strip with Order ID, Status & Action */}
      <div className="rider-action-strip">
        <div className="order-status-badge">
          <span className="status-label">Order #{orderId}</span>
          <span className="status-pill-val">Out for Delivery</span>
        </div>

        <div className="contact-actions">
          <a
            href={`tel:${phone}`}
            className="btn btn-outline-red btn-sm call-btn"
            title="Call delivery partner"
          >
            <Phone size={14} />
            <span>Call Partner</span>
          </a>
        </div>
      </div>
    </div>
  );
};
