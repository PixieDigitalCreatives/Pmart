import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, Bike, Clock, Phone, MapPin } from 'lucide-react';
import { LiveTrackingMap } from '@/components/tracking/LiveTrackingMap';
import './ShopTrackRiderModal.scss';

export const ShopTrackRiderModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal-content shop-track-rider-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="track-modal-header">
            <div className="header-info">
              <div className="badge-icon">
                <Navigation size={18} />
              </div>
              <div>
                <h3 className="modal-title">Operational Rider Tracking</h3>
                <p className="modal-desc">
                  Order #{order.id} • Assigned to {order.rider?.name || 'Delivery Partner'} ({order.rider?.vehicleNumber})
                </p>
              </div>
            </div>
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close tracking">
              <X size={18} />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="operational-metrics-strip">
            <div className="metric-cell">
              <span className="label">Order Status</span>
              <span className="val text-success">{order.status}</span>
            </div>
            <div className="metric-cell">
              <span className="label">Estimated Arrival</span>
              <span className="val">{order.tracking?.etaMinutes ? `~${order.tracking.etaMinutes} min` : 'Calculating'}</span>
            </div>
            <div className="metric-cell">
              <span className="label">Distance to Customer</span>
              <span className="val">{order.tracking?.distanceKm ? `${order.tracking.distanceKm} km` : 'Calculating'}</span>
            </div>
            <div className="metric-cell">
              <span className="label">Customer Phone</span>
              <a href={`tel:${order.customer?.phone}`} className="phone-link">
                {order.customer?.phone || 'N/A'}
              </a>
            </div>
          </div>

          {/* Map View */}
          <div className="track-map-wrapper">
            <LiveTrackingMap
              riderLocation={order.rider?.location}
              customerLocation={order.deliveryAddress}
              hubLocation={order.shop}
              etaMinutes={order.tracking?.etaMinutes}
              distanceKm={order.tracking?.distanceKm}
              riderName={order.rider?.name || 'Delivery Partner'}
              height="380px"
              orderId={order.id}
            />
          </div>

          {/* Footer */}
          <div className="track-modal-footer">
            <div className="dest-snippet">
              <MapPin size={14} className="pin-icon" />
              <span>
                <strong>Destination:</strong> {order.deliveryAddress?.line1}, {order.deliveryAddress?.city}
              </span>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close Monitor
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
