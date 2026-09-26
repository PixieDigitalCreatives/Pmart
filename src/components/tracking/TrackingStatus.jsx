import React from 'react';
import {
  Loader2,
  Navigation,
  MapPin,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  XCircle,
  KeyRound
} from 'lucide-react';
import './TrackingStatus.scss';

export const TrackingStatus = ({ trackingState = 'TRACKING_ACTIVE', onRetry = null }) => {
  const getStatusConfig = () => {
    switch (trackingState) {
      case 'TRACKING_LOADING':
        return {
          icon: <Loader2 size={16} className="animate-spin" />,
          title: "Getting your rider's location...",
          type: 'info'
        };
      case 'RIDER_NEARBY':
        return {
          icon: <Navigation size={16} className="pulsing-icon" />,
          title: 'Your rider is nearby (within 500m)',
          type: 'success'
        };
      case 'DELIVERY_ARRIVING':
        return {
          icon: <MapPin size={16} className="pulsing-icon" />,
          title: 'Your order is arriving now! Please be ready at your gate',
          type: 'warning'
        };
      case 'OTP_REQUIRED':
        return {
          icon: <KeyRound size={16} />,
          title: 'Share your delivery OTP with the partner',
          type: 'warning'
        };
      case 'DELIVERED':
        return {
          icon: <CheckCircle2 size={16} />,
          title: 'Order successfully delivered. Enjoy your groceries!',
          type: 'success'
        };
      case 'RIDER_OFFLINE':
        return {
          icon: <WifiOff size={16} />,
          title: 'Rider GPS temporarily offline • Reconnecting...',
          type: 'error'
        };
      case 'TRACKING_UNAVAILABLE':
        return {
          icon: <AlertCircle size={16} />,
          title: 'Live location is temporarily unavailable',
          type: 'error',
          retry: true
        };
      case 'ORDER_CANCELLED':
        return {
          icon: <XCircle size={16} />,
          title: 'This order has been cancelled',
          type: 'error'
        };
      case 'TRACKING_ACTIVE':
      default:
        return {
          icon: <Navigation size={16} className="active-arrow" />,
          title: 'Your order is on the way • Express delivery active',
          type: 'active'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`pmart-tracking-status-banner state-${config.type}`}>
      <div className="status-icon-wrap">{config.icon}</div>
      <div className="status-text">{config.title}</div>
      {config.retry && onRetry && (
        <button type="button" className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
};
