import React from 'react';
import { motion } from 'framer-motion';
import { TrackingStatus } from './TrackingStatus';
import { ETAIndicator } from './ETAIndicator';
import { RiderInfoCard } from './RiderInfoCard';
import { DeliveryOTP } from './DeliveryOTP';
import './TrackingPanel.scss';

export const TrackingPanel = ({
  order,
  trackingState = 'TRACKING_ACTIVE',
  etaMinutes,
  distanceKm,
  rider = null,
  otp,
  onRetry = null
}) => {
  const isNearby = trackingState === 'RIDER_NEARBY' || trackingState === 'DELIVERY_ARRIVING';

  return (
    <motion.div
      className="pmart-tracking-panel"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 1. Status Notification Bar */}
      <TrackingStatus trackingState={trackingState} onRetry={onRetry} />

      {/* 2. Real-Time ETA & Distance */}
      <ETAIndicator
        etaMinutes={etaMinutes}
        distanceKm={distanceKm}
        trackingState={trackingState}
      />

      {/* 3. Rider Information & Contact Card */}
      <RiderInfoCard
        rider={rider || order?.rider}
        orderId={order?.orderNumber}
        status={order?.status}
      />

      {/* 4. Store the order is dispatched from */}
      {order?.shop && (
        <div className="pmart-store-location-card">
          <div className="store-badge-header">
            <span className="store-pill">DISPATCHED FROM</span>
            {order.shop.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${order.shop.location.lat},${order.shop.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="store-gmaps-link"
              >
                Google Maps ↗
              </a>
            )}
          </div>
          <div className="store-main-row">
            <div className="store-pin-circle">{(order.shop.name || 'S').charAt(0).toUpperCase()}</div>
            <div className="store-meta">
              <h4 className="store-title">{order.shop.name}</h4>
              {order.shop.address && (
                <p className="store-address-text">
                  {[order.shop.address.street, order.shop.address.area, order.shop.address.city, order.shop.address.state, order.shop.address.pincode].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Delivery code */}
      <DeliveryOTP otp={otp} isNearby={isNearby} status={order?.status} />
    </motion.div>
  );
};
