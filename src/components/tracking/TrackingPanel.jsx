import React from 'react';
import { motion } from 'framer-motion';
import { TrackingStatus } from './TrackingStatus';
import { ETAIndicator } from './ETAIndicator';
import { RiderInfoCard } from './RiderInfoCard';
import { DeliveryOTP } from './DeliveryOTP';
import { OrderTimeline } from '@/components/order/OrderTimeline';
import './TrackingPanel.scss';

export const TrackingPanel = ({
  order,
  trackingState = 'TRACKING_ACTIVE',
  etaMinutes = 10,
  distanceKm = 1.4,
  rider = null,
  otp = '4829',
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
        orderId={order?.id}
        status={order?.status}
      />

      {/* 4. Store Dispatch Hub Location */}
      <div className="pmart-store-location-card">
        <div className="store-badge-header">
          <span className="store-pill">FULFILLMENT DARKSTORE</span>
          <a
            href="https://maps.app.goo.gl/rpyAd9tmiLKiQFyQ9"
            target="_blank"
            rel="noopener noreferrer"
            className="store-gmaps-link"
            title="Open exact location on Google Maps"
          >
            Google Maps ↗
          </a>
        </div>
        <div className="store-main-row">
          <div className="store-pin-circle">P</div>
          <div className="store-meta">
            <h4 className="store-title">{order?.shop?.name || 'P Mart Sasaram'}</h4>
            <p className="store-address-text">
              {order?.shop?.address || 'P Mart, Panjar Colony, Near Sasaram Junction, Sasaram, Bihar 821115'}
            </p>
            <span className="store-geo-tag">📍 GPS: 24.9588592° N, 84.0155717° E</span>
          </div>
        </div>
      </div>

      {/* 5. Delivery Verification OTP */}
      <DeliveryOTP otp={otp || order?.deliveryOtp} isNearby={isNearby} />

      {/* 5. Existing PMart Order Timeline */}
      <div className="tracking-timeline-card">
        <h4 className="timeline-title">Fulfillment Progress</h4>
        <OrderTimeline timeline={order?.timeline || []} />
      </div>
    </motion.div>
  );
};
