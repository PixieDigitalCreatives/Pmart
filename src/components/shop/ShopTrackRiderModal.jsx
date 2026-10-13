import React from 'react';
import { X, Navigation, MapPin } from 'lucide-react';
import { LiveTrackingMap } from '@/components/tracking/LiveTrackingMap';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { ORDER_STATUS_LABELS } from '@/types/orderTypes';
import { Button } from '@/components/ui';
import './ShopTrackRiderModal.scss';

/** Live rider position for one order, for store and operations staff. */
export const ShopTrackRiderModal = ({ isOpen, onClose, order }) => {
  const tracking = useLiveTracking(isOpen && order ? order._id : null);
  if (!isOpen || !order) return null;

  const dest = order.deliveryAddress || {};
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content shop-track-rider-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="track-modal-header">
          <div className="header-info">
            <div className="badge-icon">
              <Navigation size={18} />
            </div>
            <div>
              <h3 className="modal-title">Rider tracking</h3>
              <p className="modal-desc">
                Order #{order.orderNumber} • {order.rider?.name || 'Rider'} {order.rider?.vehicleNumber ? `(${order.rider.vehicleNumber})` : ''}
              </p>
            </div>
          </div>
          <Button type="button" className="close-btn" onClick={onClose} aria-label="Close tracking">
            <X size={18} />
          </Button>
        </div>

        <div className="operational-metrics-strip">
          <div className="metric-cell">
            <span className="label">Status</span>
            <span className="val text-success">{ORDER_STATUS_LABELS[tracking.status || order.status]}</span>
          </div>
          <div className="metric-cell">
            <span className="label">Estimated arrival</span>
            <span className="val">{tracking.etaMinutes ? `~${tracking.etaMinutes} min` : '—'}</span>
          </div>
          <div className="metric-cell">
            <span className="label">Distance to customer</span>
            <span className="val">{tracking.distanceKm != null ? `${tracking.distanceKm} km` : '—'}</span>
          </div>
          <div className="metric-cell">
            <span className="label">Last GPS update</span>
            <span className="val">{tracking.riderLocation?.updatedAt ? new Date(tracking.riderLocation.updatedAt).toLocaleTimeString('en-IN') : 'Waiting for GPS'}</span>
          </div>
        </div>

        <div className="track-map-wrapper">
          <LiveTrackingMap
            riderLocation={tracking.riderLocation}
            customerLocation={tracking.customerLocation || order.deliveryAddress}
            hubLocation={tracking.hubLocation || order.shop}
            riderName={order.rider?.name || 'Rider'}
            route={tracking.route}
            routeError={tracking.routeError}
            height="380px"
            orderId={order._id}
          />
        </div>

        <div className="track-modal-footer">
          <div className="dest-snippet">
            <MapPin size={14} className="pin-icon" />
            <span>
              <strong>Destination:</strong> {[dest.houseNumber, dest.street, dest.area, dest.city, dest.pincode].filter(Boolean).join(', ')}
            </span>
          </div>
          <Button type="button" onClick={onClose} variant="secondary" size="sm">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
