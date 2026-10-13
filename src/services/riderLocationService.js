import apiClient from './apiClient';

const MIN_SEND_INTERVAL_MS = 4000; // the API accepts at most ~40 updates per minute

let watchId = null;
let lastSentAt = 0;

const GEO_ERRORS = {
  1: 'Location permission is blocked. Allow location access to share your position.',
  2: 'Your position is unavailable. Check that GPS is on.',
  3: 'Getting your position timed out. Retrying…'
};

/** Shares the rider's GPS position for the given order while a delivery is in progress. */
export const riderLocationService = {
  startBroadcasting(orderId, onLocation, onError) {
    if (!('geolocation' in navigator) || watchId !== null) return;

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        onLocation?.({ lat: latitude, lng: longitude });

        const now = Date.now();
        if (now - lastSentAt < MIN_SEND_INTERVAL_MS) return;
        lastSentAt = now;
        apiClient
          .post('/rider/location', { latitude, longitude, accuracy, speed, heading, timestamp: position.timestamp, orderId })
          .catch(() => {
            // A dropped update is replaced by the next one.
          });
      },
      (error) => onError?.(GEO_ERRORS[error.code] || 'Could not read your location.'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  },

  stopBroadcasting() {
    if (watchId !== null && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  },

  isActive: () => watchId !== null
};
