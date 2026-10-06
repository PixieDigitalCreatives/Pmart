import apiClient from './apiClient';

const isDev = import.meta.env.DEV;
const log = (...args) => { if (isDev) console.log('[RIDER GPS]', ...args); };

let watchId = null;

export const riderLocationService = {
  /**
   * Starts watching the rider's GPS location and broadcasting to the backend
   * @param {string} orderId - Active order ID
   * @param {function} onLocationUpdate - Callback with {lat, lng} when location updates
   */
  startBroadcasting: (orderId = null, onLocationUpdate = null) => {
    if (!('geolocation' in navigator)) {
      console.error('[RIDER GPS] Geolocation not supported');
      return;
    }

    if (watchId !== null) {
      log('Already broadcasting, skipping new watch');
      return;
    }

    log('Starting location broadcast for order:', orderId);

    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        const timestamp = position.timestamp;

        log('SEND lat:', latitude, 'lng:', longitude, 'orderId:', orderId);

        // Update local state immediately
        if (onLocationUpdate) {
          onLocationUpdate({ lat: latitude, lng: longitude });
        }

        // Send to backend
        try {
          await apiClient.post('/rider/location', {
            latitude,
            longitude,
            accuracy,
            speed,
            heading,
            timestamp,
            orderId
          });
          log('Location sent to backend OK');
        } catch (error) {
          log('Failed to send to backend:', error?.response?.data || error.message);
        }
      },
      (error) => {
        log('watchPosition error:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    log('watchId assigned:', watchId);
  },

  /**
   * Stops broadcasting the rider's location
   */
  stopBroadcasting: () => {
    if (watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId);
      log('Stopped broadcasting, cleared watchId:', watchId);
      watchId = null;
    }
  },

  isActive: () => watchId !== null,
};
